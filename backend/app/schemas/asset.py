"""
Asset Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class AssetBase(BaseModel):
    asset_tag: str
    name: str
    description: Optional[str] = None
    category: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[Decimal] = None
    warranty_expiration: Optional[datetime] = None
    condition: str = "Good"
    location: Optional[str] = None
    status: str = "Available"
    notes: Optional[str] = None
    is_active: bool = True
    employee_id: Optional[str] = None
    assigned_date: Optional[datetime] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    asset_tag: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[Decimal] = None
    warranty_expiration: Optional[datetime] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    employee_id: Optional[str] = None
    assigned_date: Optional[datetime] = None


class AssetResponse(AssetBase):
    id: str
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None  # Computed field

    class Config:
        from_attributes = True
