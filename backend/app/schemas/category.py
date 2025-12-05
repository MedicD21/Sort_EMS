"""
Category Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    """Base category schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class CategoryCreate(CategoryBase):
    """Schema for creating a category"""
    id: str = Field(..., min_length=1, max_length=50, pattern="^[A-Z0-9_]+$")


class CategoryUpdate(BaseModel):
    """Schema for updating a category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    """Schema for category responses"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
