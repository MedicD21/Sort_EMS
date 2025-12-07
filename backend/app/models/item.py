"""
Item and Category models for supply management
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, Integer, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel
from app.core.database import Base


class Category(Base):
    """Category model for organizing items with string-based IDs"""
    __tablename__ = "categories"
    
    # Primary key as string (not UUID)
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(500), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color code
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Timestamps (manually added since not using BaseModel)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    items = relationship("Item", back_populates="category")
    
    def __repr__(self):
        return f"<Category {self.id}: {self.name}>"


class Item(BaseModel):
    """Item model for supplies and equipment"""
    __tablename__ = "items"
    
    item_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    category_id = Column(
        String(50),
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
    
    # Supplier information
    supplier_name = Column(String(255), nullable=True)
    supplier_contact = Column(String(255), nullable=True)
    supplier_email = Column(String(255), nullable=True)
    supplier_phone = Column(String(50), nullable=True)
    supplier_website = Column(String(500), nullable=True)
    supplier_account_number = Column(String(100), nullable=True)
    
    # Ordering information
    minimum_order_quantity = Column(Numeric(10, 2), nullable=True)
    max_reorder_quantity_per_station = Column(Integer, nullable=True)  # Max allowed to reorder per station
    order_unit = Column(String(100), nullable=True)
    lead_time_days = Column(Numeric(5, 0), nullable=True)
    preferred_vendor = Column(String(255), nullable=True)
    alternate_vendor = Column(String(255), nullable=True)
    
    # Relationships
    category = relationship("Category", back_populates="items")
    par_levels = relationship("ParLevel", back_populates="item")
    rfid_tags = relationship("RFIDTag", back_populates="item")
    inventory_current = relationship("InventoryCurrent", back_populates="item")
    inventory_items = relationship("InventoryItem", back_populates="item")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="item")
    auto_order_rules = relationship("AutoOrderRule", back_populates="item")
    inventory_movements = relationship("InventoryMovement", back_populates="item")
    
    def __repr__(self):
        return f"<Item {self.item_code}: {self.name}>"
