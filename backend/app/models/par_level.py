"""
Par Level model for managing stock levels at different locations
"""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class ParLevel(BaseModel):
    """Par Level model for defining stock levels"""
    __tablename__ = "par_levels"
    __table_args__ = (
        UniqueConstraint('location_id', 'item_id', name='unique_location_item_par'),
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
    par_quantity = Column(Integer, nullable=False)  # Standard stock level
    reorder_quantity = Column(Integer, nullable=False)  # Minimum before reorder
    max_quantity = Column(Integer, nullable=True)  # Maximum to stock
    
    # Relationships
    location = relationship("Location", back_populates="par_levels")
    item = relationship("Item", back_populates="par_levels")
    
    def __repr__(self):
        return f"<ParLevel {self.item_id} @ {self.location_id}: {self.par_quantity}>"
