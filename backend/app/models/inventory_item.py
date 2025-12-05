"""
Individual inventory item tracking model
Each record represents a single physical item with its own RFID tag and expiration date
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from .base import Base


class InventoryItem(Base):
    """Individual inventory item (e.g., one bandage in a bag of 5)"""
    
    __tablename__ = "inventory_items"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False, index=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False, index=True)
    rfid_tag = Column(String(255), unique=True, nullable=False, index=True)
    expiration_date = Column(TIMESTAMP, nullable=True)
    lot_number = Column(String(100), nullable=True)
    truck_location = Column(String(100), nullable=True)  # Where on truck: "Bag A", "Shelf 1", etc.
    received_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    item = relationship("Item", back_populates="inventory_items")
    location = relationship("Location", back_populates="inventory_items")
