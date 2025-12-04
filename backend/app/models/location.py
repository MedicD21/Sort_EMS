"""
Location models for multi-level inventory tracking
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.models.base import BaseModel


class LocationType(str, enum.Enum):
    """Location type enumeration"""
    SUPPLY_STATION = "supply_station"
    STATION_CABINET = "station_cabinet"
    VEHICLE = "vehicle"


class Location(BaseModel):
    """Location model for tracking inventory at different levels"""
    __tablename__ = "locations"
    
    name = Column(String(255), nullable=False, index=True)
    type = Column(SQLEnum(LocationType), nullable=False)
    parent_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True
    )
    address = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    parent_location = relationship(
        "Location",
        remote_side="Location.id",
        back_populates="child_locations"
    )
    child_locations = relationship(
        "Location",
        back_populates="parent_location",
        cascade="all, delete-orphan"
    )
    par_levels = relationship("ParLevel", back_populates="location")
    inventory_current = relationship("InventoryCurrent", back_populates="location")
    rfid_tags = relationship("RFIDTag", back_populates="current_location")
    movements_from = relationship(
        "InventoryMovement",
        foreign_keys="InventoryMovement.from_location_id",
        back_populates="from_location"
    )
    movements_to = relationship(
        "InventoryMovement",
        foreign_keys="InventoryMovement.to_location_id",
        back_populates="to_location"
    )
    
    def __repr__(self):
        return f"<Location {self.name} ({self.type})>"
