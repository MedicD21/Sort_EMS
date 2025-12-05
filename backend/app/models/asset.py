"""
Asset Model
"""
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_tag = Column(String(100), unique=True, nullable=False, index=True)  # Unique asset identifier
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # e.g., "Electronics", "Furniture", "Medical Equipment", "Vehicle"
    manufacturer = Column(String(255), nullable=True)
    model = Column(String(255), nullable=True)
    serial_number = Column(String(255), nullable=True, index=True)
    purchase_date = Column(DateTime, nullable=True)
    purchase_price = Column(Numeric(10, 2), nullable=True)
    warranty_expiration = Column(DateTime, nullable=True)
    condition = Column(String(50), nullable=False, default="Good")  # Good, Fair, Poor, Needs Repair, Out of Service
    location = Column(String(255), nullable=True)  # Physical location of asset
    status = Column(String(50), nullable=False, default="Available")  # Available, Assigned, In Use, In Maintenance, Disposed
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Assignment tracking
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    assigned_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="assets")

    def __repr__(self):
        return f"<Asset {self.asset_tag}: {self.name}>"
