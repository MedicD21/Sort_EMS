"""
Internal Restock Order models for logistics between locations
"""
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSON
import enum
from datetime import datetime
from app.models.base import BaseModel


class InternalOrderStatus(str, enum.Enum):
    """Internal order status enumeration"""
    PENDING = "pending"
    ORDER_RECEIVED = "order_received"
    OUT_FOR_DELIVERY = "out_for_delivery"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InternalOrder(BaseModel):
    """Internal restock order for moving items between locations"""
    __tablename__ = "internal_orders"
    
    order_number = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(InternalOrderStatus), nullable=False, default=InternalOrderStatus.PENDING)
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_date = Column(DateTime, nullable=True)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    notes = Column(Text, nullable=True)
    
    # Store location details in JSON for flexibility
    # Format: [{"location_id": "...", "location_name": "Station 1", "items": [...]}]
    location_details = Column(JSON, nullable=True)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    items = relationship("InternalOrderItem", back_populates="order", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<InternalOrder {self.order_number} - {self.status}>"


class InternalOrderItem(BaseModel):
    """Items in an internal restock order"""
    __tablename__ = "internal_order_items"
    
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("internal_orders.id", ondelete="CASCADE"),
        nullable=False
    )
    item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="RESTRICT"),
        nullable=False
    )
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False
    )
    quantity_needed = Column(Integer, nullable=False)
    quantity_delivered = Column(Integer, default=0, nullable=False)
    current_stock = Column(Integer, nullable=True)  # Stock at time of order
    par_level = Column(Integer, nullable=True)  # Par level at time of order
    
    # Relationships
    order = relationship("InternalOrder", back_populates="items")
    item = relationship("Item")
    location = relationship("Location")
    
    def __repr__(self):
        return f"<InternalOrderItem {self.item_id} for {self.location_id}>"
