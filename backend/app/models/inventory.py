"""
Current Inventory model for tracking real-time stock levels
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class InventoryCurrent(BaseModel):
    """Current Inventory model for real-time stock tracking"""
    __tablename__ = "inventory_current"
    __table_args__ = (
        UniqueConstraint('location_id', 'item_id', name='unique_location_item_inventory'),
    )
    
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="CASCADE"),
        nullable=False
    )
    item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False
    )
    quantity_on_hand = Column(Integer, nullable=False, default=0)
    quantity_allocated = Column(Integer, nullable=False, default=0)
    # quantity_available = quantity_on_hand - quantity_allocated (computed)
    expiration_date = Column(DateTime, nullable=True)
    last_counted_at = Column(DateTime, nullable=True)
    last_counted_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Relationships
    location = relationship("Location", back_populates="inventory_current")
    item = relationship("Item", back_populates="inventory_current")
    
    @property
    def quantity_available(self):
        """Compute available quantity"""
        return self.quantity_on_hand - self.quantity_allocated
    
    def __repr__(self):
        return f"<InventoryCurrent {self.item_id} @ {self.location_id}: {self.quantity_on_hand}>"
