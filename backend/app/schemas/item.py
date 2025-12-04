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
    category_id: Optional[UUID] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    unit_of_measure: str = "each"
    unit_cost: Optional[float] = None
    is_controlled_substance: bool = False
    requires_prescription: bool = False
    reorder_point: Optional[int] = None
    reorder_quantity: Optional[int] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    unit_of_measure: Optional[str] = None
    unit_cost: Optional[float] = None
    is_controlled_substance: Optional[bool] = None
    requires_prescription: Optional[bool] = None
    reorder_point: Optional[int] = None
    reorder_quantity: Optional[int] = None


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
    location_name: Optional[str] = None
    category_name: Optional[str] = None

    class Config:
        from_attributes = True
