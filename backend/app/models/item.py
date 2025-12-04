"""
Item and Category models for supply management
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class Category(BaseModel):
    """Category model for organizing items"""
    __tablename__ = "categories"
    
    name = Column(String(255), nullable=False, unique=True, index=True)
    parent_category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Relationships
    parent_category = relationship(
        "Category",
        remote_side="Category.id",
        back_populates="child_categories"
    )
    child_categories = relationship(
        "Category",
        back_populates="parent_category",
        cascade="all, delete-orphan"
    )
    items = relationship("Item", back_populates="category")
    
    def __repr__(self):
        return f"<Category {self.name}>"


class Item(BaseModel):
    """Item model for supplies and equipment"""
    __tablename__ = "items"
    
    item_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=True
    )
    unit_of_measure = Column(String(50), nullable=False)  # EA, Box, Roll, etc.
    requires_expiration_tracking = Column(Boolean, default=False, nullable=False)
    is_controlled_substance = Column(Boolean, default=False, nullable=False)
    manufacturer = Column(String(255), nullable=True)
    manufacturer_part_number = Column(String(255), nullable=True)
    cost_per_unit = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    category = relationship("Category", back_populates="items")
    par_levels = relationship("ParLevel", back_populates="item")
    rfid_tags = relationship("RFIDTag", back_populates="item")
    inventory_current = relationship("InventoryCurrent", back_populates="item")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="item")
    auto_order_rules = relationship("AutoOrderRule", back_populates="item")
    
    def __repr__(self):
        return f"<Item {self.item_code}: {self.name}>"
