"""
RFID Tag and Inventory Movement models for tracking individual items
"""
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from datetime import datetime
from app.models.base import BaseModel


class TagStatus(str, enum.Enum):
    """RFID Tag status enumeration"""
    IN_STOCK = "in_stock"
    IN_USE = "in_use"
    DEPLETED = "depleted"
    EXPIRED = "expired"
    DISPOSED = "disposed"


class MovementType(str, enum.Enum):
    """Inventory movement type enumeration"""
    RECEIVE = "receive"
    TRANSFER = "transfer"
    USE = "use"
    DISPOSE = "dispose"
    RESTOCK = "restock"
    ADJUSTMENT = "adjustment"


class RFIDTag(BaseModel):
    """RFID Tag model for tracking individual items"""
    __tablename__ = "rfid_tags"
    
    tag_id = Column(String(255), unique=True, nullable=False, index=True)
    item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="RESTRICT"),
        nullable=False
    )
    current_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True
    )
    status = Column(SQLEnum(TagStatus), nullable=False, default=TagStatus.IN_STOCK)
    expiration_date = Column(DateTime, nullable=True)
    lot_number = Column(String(100), nullable=True)
    received_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    cost = Column(Numeric(10, 2), nullable=True)
    
    # Relationships
    item = relationship("Item", back_populates="rfid_tags")
    current_location = relationship("Location", back_populates="rfid_tags")
    inventory_movements = relationship("InventoryMovement", back_populates="rfid_tag")
    controlled_substance_logs = relationship(
        "ControlledSubstanceLog",
        back_populates="rfid_tag"
    )
    
    def __repr__(self):
        return f"<RFIDTag {self.tag_id} - {self.status}>"


class InventoryMovement(BaseModel):
    """Inventory Movement model for tracking item movements"""
    __tablename__ = "inventory_movements"
    
    rfid_tag_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rfid_tags.id", ondelete="CASCADE"),
        nullable=False
    )
    from_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True
    )
    to_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True
    )
    movement_type = Column(SQLEnum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    notes = Column(String(1000), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    rfid_tag = relationship("RFIDTag", back_populates="inventory_movements")
    from_location = relationship(
        "Location",
        foreign_keys=[from_location_id],
        back_populates="movements_from"
    )
    to_location = relationship(
        "Location",
        foreign_keys=[to_location_id],
        back_populates="movements_to"
    )
    user = relationship("User", back_populates="inventory_movements")
    
    def __repr__(self):
        return f"<Movement {self.movement_type} @ {self.timestamp}>"
