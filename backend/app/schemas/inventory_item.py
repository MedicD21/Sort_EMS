"""
Individual Inventory Item Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class InventoryItemBase(BaseModel):
    """Base schema for individual inventory items"""
    rfid_tag: str
    expiration_date: Optional[datetime] = None
    lot_number: Optional[str] = None
    truck_location: Optional[str] = None  # Where on truck: "Bag A", "Shelf 1", etc.


class InventoryItemCreate(InventoryItemBase):
    """Schema for creating a new individual inventory item"""
    item_id: UUID
    location_id: UUID
    received_date: Optional[datetime] = None


class InventoryItemBulkCreate(BaseModel):
    """Schema for creating multiple items with same expiration (e.g., bag of 5)"""
    item_id: UUID
    location_id: UUID
    quantity: int
    expiration_date: Optional[datetime] = None
    lot_number: Optional[str] = None
    truck_location: Optional[str] = None  # For truck locations
    received_date: Optional[datetime] = None
    rfid_tag_prefix: Optional[str] = None  # If provided, generates tags like PREFIX-001, PREFIX-002, etc.


class InventoryItemUpdate(BaseModel):
    """Schema for updating an individual inventory item"""
    expiration_date: Optional[datetime] = None
    lot_number: Optional[str] = None
    truck_location: Optional[str] = None
    location_id: Optional[UUID] = None


class InventoryItemResponse(InventoryItemBase):
    """Schema for individual inventory item response"""
    id: int
    item_id: UUID
    location_id: UUID
    received_date: datetime
    created_at: datetime
    updated_at: datetime
    
    # Optional nested data
    item_name: Optional[str] = None
    location_name: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryItemListResponse(BaseModel):
    """Schema for listing individual items with summary"""
    items: list[InventoryItemResponse]
    total_count: int
    expiring_soon_count: int  # Count of items expiring within 30 days
    earliest_expiration: Optional[datetime] = None
