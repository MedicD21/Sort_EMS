"""
Item Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from uuid import UUID

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None  # Changed from UUID to String
    sku: Optional[str] = None
    barcode: Optional[str] = None
    unit_of_measure: str = "each"
    unit_cost: Optional[float] = None
    is_controlled_substance: bool = False
    requires_prescription: bool = False
    requires_expiration_tracking: bool = False
    reorder_point: Optional[int] = None
    reorder_quantity: Optional[int] = None
    manufacturer: Optional[str] = None
    manufacturer_part_number: Optional[str] = None
    # Supplier information
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    supplier_website: Optional[str] = None
    supplier_account_number: Optional[str] = None
    # Ordering information
    minimum_order_quantity: Optional[int] = None
    max_reorder_quantity_per_station: Optional[int] = None
    order_unit: Optional[str] = None
    lead_time_days: Optional[int] = None
    preferred_vendor: Optional[str] = None
    alternate_vendor: Optional[str] = None
    is_active: bool = True


class ItemCreate(ItemBase):
    """Schema for creating items - maps sku to item_code"""
    
    @property
    def item_code(self) -> Optional[str]:
        """Map sku to item_code for database"""
        return self.sku


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None  # Changed from UUID to String
    sku: Optional[str] = None
    barcode: Optional[str] = None
    unit_of_measure: Optional[str] = None
    unit_cost: Optional[float] = None
    is_controlled_substance: Optional[bool] = None
    requires_prescription: Optional[bool] = None
    requires_expiration_tracking: Optional[bool] = None
    reorder_point: Optional[int] = None
    reorder_quantity: Optional[int] = None
    manufacturer: Optional[str] = None
    manufacturer_part_number: Optional[str] = None
    # Supplier information
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    supplier_website: Optional[str] = None
    supplier_account_number: Optional[str] = None
    # Ordering information
    minimum_order_quantity: Optional[int] = None
    max_reorder_quantity_per_station: Optional[int] = None
    order_unit: Optional[str] = None
    lead_time_days: Optional[int] = None
    preferred_vendor: Optional[str] = None
    alternate_vendor: Optional[str] = None
    is_active: Optional[bool] = None
    # Additional fields for inventory management
    current_stock: Optional[int] = None
    par_level: Optional[int] = None
    reorder_level: Optional[int] = None
    rfid_tag: Optional[str] = None
    location_id: Optional[UUID] = None  # For location-specific stock updates
    expiration_date: Optional[datetime] = None  # For expiration tracking


class ItemResponse(ItemBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ItemWithStock(ItemResponse):
    """Item with current stock information"""
    current_stock: int = 0
    par_level: Optional[int] = None
    reorder_level: Optional[int] = None
    location_name: Optional[str] = None
    location_id: Optional[str] = None
    category_name: Optional[str] = None
    rfid_tag: Optional[str] = None
    expiration_date: Optional[datetime] = None
    expiring_soon_count: Optional[int] = None
    expired_count: Optional[int] = None

    class Config:
        from_attributes = True
