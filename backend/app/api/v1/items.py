"""
Items API Routes
"""
from typing import List, Optional, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.item import Item
from app.models.par_level import ParLevel
from app.models.inventory import InventoryCurrent
from app.models.location import Location
from app.schemas.item import ItemResponse, ItemCreate, ItemUpdate, ItemWithStock

router = APIRouter()


@router.get("/", response_model=List[ItemWithStock])
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of all items with stock information
    """
    # Temporarily disabled auth for debugging
    # current_user: Annotated[User, Depends(get_current_user)] = None,
    query = db.query(Item)
    
    # Apply search filter
    if search:
        query = query.filter(
            or_(
                Item.name.ilike(f"%{search}%"),
                Item.description.ilike(f"%{search}%"),
                Item.sku.ilike(f"%{search}%"),
                Item.barcode.ilike(f"%{search}%")
            )
        )
    
    # Apply category filter
    if category_id:
        query = query.filter(Item.category_id == category_id)
    
    # Get items
    items = query.offset(skip).limit(limit).all()
    
    # Enrich with stock information
    result = []
    for item in items:
        # Category name is not stored separately, skip for now
        category_name = None
        
        # Get par level (just get the first one for now)
        par_level_obj = db.query(ParLevel).filter(ParLevel.item_id == item.id).first()
        par_level = par_level_obj.par_quantity if par_level_obj else None
        location_name = None
        if par_level_obj and par_level_obj.location_id:
            location = db.query(Location).filter(Location.id == par_level_obj.location_id).first()
            if location:
                location_name = location.name
        
        # Get current stock (sum across all locations)
        current_stock = db.query(func.sum(InventoryCurrent.quantity)).filter(
            InventoryCurrent.item_id == item.id
        ).scalar() or 0
        
        item_dict = {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "category_id": item.category_id,
            "sku": item.sku,
            "barcode": item.barcode,
            "unit_of_measure": item.unit_of_measure,
            "unit_cost": item.unit_cost,
            "is_controlled_substance": item.is_controlled_substance,
            "requires_prescription": item.requires_prescription,
            "reorder_point": item.reorder_point,
            "reorder_quantity": item.reorder_quantity,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "current_stock": int(current_stock),
            "par_level": par_level,
            "location_name": location_name,
            "category_name": category_name
        }
        result.append(item_dict)
    
    return result


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific item by ID
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return item


@router.post("/", response_model=ItemResponse)
async def create_item(
    item_data: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new item
    """
    item = Item(**item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: UUID,
    item_data: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing item
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Update only provided fields
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
async def delete_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an item
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}
