"""
Locations API Routes
Manages location hierarchy: Supply Station → Station Cabinets → Vehicles
"""
from typing import List, Optional, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.location import Location, LocationType
from app.models.inventory import InventoryCurrent
from app.models.item import Item
from app.schemas.user import UserResponse

router = APIRouter()


# Pydantic schemas for locations
from pydantic import BaseModel
from datetime import datetime


class LocationBase(BaseModel):
    name: str
    type: LocationType
    parent_location_id: Optional[UUID] = None
    address: Optional[str] = None
    is_active: bool = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[LocationType] = None
    parent_location_id: Optional[UUID] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class LocationResponse(LocationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class InventoryItemResponse(BaseModel):
    """Inventory item at a specific location"""
    item_id: UUID
    item_name: str
    item_code: str
    quantity_on_hand: int
    quantity_allocated: int
    quantity_available: int
    unit_of_measure: str
    par_quantity: Optional[int] = None
    is_below_par: bool = False


class LocationInventoryResponse(BaseModel):
    """Location with its inventory"""
    location: LocationResponse
    items: List[InventoryItemResponse]
    total_items: int
    items_below_par: int


@router.get("/", response_model=List[LocationResponse])
async def list_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: Optional[LocationType] = None,
    is_active: Optional[bool] = None,
    # current_user: User = Depends(get_current_user),  # Disabled for testing
    db: Session = Depends(get_db)
):
    """
    Get list of all locations
    """
    query = db.query(Location)
    
    # Apply filters
    if type:
        query = query.filter(Location.type == type)
    if is_active is not None:
        query = query.filter(Location.is_active == is_active)
    
    locations = query.order_by(Location.name).offset(skip).limit(limit).all()
    return locations


@router.get("/hierarchy", response_model=List[LocationResponse])
async def get_location_hierarchy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get location hierarchy (Supply Station → Station Cabinets → Vehicles)
    Returns all locations in hierarchical order
    """
    # Get all active locations ordered by type (supply station first, then cabinets, then vehicles)
    locations = db.query(Location).filter(
        Location.is_active == True
    ).order_by(
        Location.type,
        Location.name
    ).all()
    
    return locations


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific location by ID
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    return location


@router.get("/{location_id}/inventory", response_model=LocationInventoryResponse)
async def get_location_inventory(
    location_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get inventory for a specific location with par level comparison
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Get all inventory items for this location
    inventory_items = db.query(InventoryCurrent).filter(
        InventoryCurrent.location_id == location_id
    ).all()
    
    items_list = []
    items_below_par = 0
    
    for inv in inventory_items:
        # Get item details
        item = db.query(Item).filter(Item.id == inv.item_id).first()
        if not item:
            continue
        
        # Get par level for this location/item
        from app.models.par_level import ParLevel
        par_level_obj = db.query(ParLevel).filter(
            ParLevel.location_id == location_id,
            ParLevel.item_id == inv.item_id
        ).first()
        
        par_quantity = par_level_obj.par_quantity if par_level_obj else None
        quantity_available = inv.quantity_on_hand - inv.quantity_allocated
        is_below_par = False
        
        if par_quantity and quantity_available < par_quantity:
            is_below_par = True
            items_below_par += 1
        
        items_list.append(InventoryItemResponse(
            item_id=item.id,
            item_name=item.name,
            item_code=item.item_code,
            quantity_on_hand=inv.quantity_on_hand,
            quantity_allocated=inv.quantity_allocated,
            quantity_available=quantity_available,
            unit_of_measure=item.unit_of_measure,
            par_quantity=par_quantity,
            is_below_par=is_below_par
        ))
    
    return LocationInventoryResponse(
        location=LocationResponse.model_validate(location),
        items=items_list,
        total_items=len(items_list),
        items_below_par=items_below_par
    )


@router.get("/{location_id}/children", response_model=List[LocationResponse])
async def get_child_locations(
    location_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all child locations of a specific location
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    children = db.query(Location).filter(
        Location.parent_location_id == location_id
    ).order_by(Location.name).all()
    
    return children


@router.post("/", response_model=LocationResponse)
async def create_location(
    location_data: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new location
    """
    # Verify parent location exists if provided
    if location_data.parent_location_id:
        parent = db.query(Location).filter(
            Location.id == location_data.parent_location_id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent location not found")
    
    location = Location(**location_data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: UUID,
    location_data: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing location
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Update only provided fields
    update_data = location_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)
    
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}")
async def delete_location(
    location_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a location (marks as inactive)
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Check if location has children
    children = db.query(Location).filter(
        Location.parent_location_id == location_id
    ).count()
    
    if children > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete location with child locations. Delete children first."
        )
    
    # Mark as inactive instead of deleting
    location.is_active = False
    db.commit()
    
    return {"message": "Location deactivated successfully"}
