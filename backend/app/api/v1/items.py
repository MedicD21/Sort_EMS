"""
Items API Routes
"""
from typing import List, Optional, Annotated
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.item import Item, Category
from app.models.par_level import ParLevel
from app.models.inventory import InventoryCurrent
from app.models.inventory_item import InventoryItem
from app.models.location import Location
from app.schemas.item import ItemResponse, ItemCreate, ItemUpdate, ItemWithStock

router = APIRouter()


@router.get("/", response_model=List[ItemWithStock])
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    location_id: Optional[str] = None,
    station: Optional[str] = None,  # e.g., "station_1" to sum cabinet + truck
    db: Session = Depends(get_db)
):
    """
    Get list of all items with stock information
    Can filter by specific location_id OR by station (which sums cabinet + truck)
    """
    # Temporarily disabled auth for debugging
    # current_user: Annotated[User, Depends(get_current_user)] = None,
    
    # Convert location_id string to UUID if provided, or get location UUIDs for station
    location_uuids = []
    if location_id:
        try:
            from uuid import UUID as UUID_type
            location_uuids = [UUID_type(location_id)]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid location_id format")
    elif station:
        # Get both cabinet and truck for this station
        station_num = station.replace("station_", "")
        cabinet_name = f"Station {station_num} Cabinet"
        truck_name = f"Station {station_num} Truck"
        
        locations_to_sum = db.query(Location).filter(
            Location.name.in_([cabinet_name, truck_name])
        ).all()
        location_uuids = [loc.id for loc in locations_to_sum]
    
    query = db.query(Item).options(joinedload(Item.category))
    
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
        # Get category name from relationship
        category_name = item.category.name if item.category else None
        
        # Get par level and stock for specific location(s) or all locations
        if location_uuids:
            if len(location_uuids) == 1:
                # Single location - return exact values
                location_uuid = location_uuids[0]
                par_level_obj = db.query(ParLevel).filter(
                    ParLevel.item_id == item.id,
                    ParLevel.location_id == location_uuid
                ).first()
                
                inventory_record = db.query(InventoryCurrent).filter(
                    InventoryCurrent.item_id == item.id,
                    InventoryCurrent.location_id == location_uuid
                ).first()
                current_stock = inventory_record.quantity_on_hand if inventory_record else 0
                expiration_date = inventory_record.expiration_date if inventory_record else None
                
                location_name = None
                location_id_str = str(location_uuid)
                location_obj = db.query(Location).filter(Location.id == location_uuid).first()
                if location_obj:
                    location_name = location_obj.name
            else:
                # Multiple locations (station with cabinet + truck) - sum them
                par_level_obj = db.query(ParLevel).filter(
                    ParLevel.item_id == item.id,
                    ParLevel.location_id.in_(location_uuids)
                ).first()  # Get first par level for reference
                
                # Sum stock across the specified locations
                current_stock = db.query(func.sum(InventoryCurrent.quantity_on_hand)).filter(
                    InventoryCurrent.item_id == item.id,
                    InventoryCurrent.location_id.in_(location_uuids)
                ).scalar() or 0
                
                # Use first location's info for reference
                location_name = f"Station {station.replace('station_', '')} (Cabinet + Truck)" if station else "Multiple Locations"
                location_id_str = str(location_uuids[0]) if location_uuids else None
                expiration_date = None  # Can't show single expiration for multiple locations
        else:
            # No specific location - get first par level for any location
            par_level_obj = db.query(ParLevel).filter(ParLevel.item_id == item.id).first()
            
            # Sum stock across all locations
            current_stock = db.query(func.sum(InventoryCurrent.quantity_on_hand)).filter(
                InventoryCurrent.item_id == item.id
            ).scalar() or 0
            
            # Use the first par level's location
            location_name = None
            location_id_str = None
            expiration_date = None
            if par_level_obj and par_level_obj.location_id:
                location = db.query(Location).filter(Location.id == par_level_obj.location_id).first()
                if location:
                    location_name = location.name
                    location_id_str = str(location.id)
        
        par_level = par_level_obj.par_quantity if par_level_obj else None
        reorder_level = par_level_obj.reorder_quantity if par_level_obj else None
        
        # Get expiration information from individual items
        expiration_info = {"expiration_date": None, "expiring_soon_count": 0, "expired_count": 0}
        
        # Build query for individual items
        if location_uuids and len(location_uuids) > 0:
            # Query individual items for this item at specific locations
            individual_items_query = db.query(InventoryItem).filter(
                InventoryItem.item_id == item.id,
                InventoryItem.location_id.in_(location_uuids)
            )
        else:
            # Master view - query individual items across ALL locations
            individual_items_query = db.query(InventoryItem).filter(
                InventoryItem.item_id == item.id
            )
        
        # Get earliest expiration date
        earliest_exp = individual_items_query.filter(
            InventoryItem.expiration_date.isnot(None)
        ).order_by(InventoryItem.expiration_date.asc()).first()
        
        if earliest_exp:
            expiration_info["expiration_date"] = earliest_exp.expiration_date
        
        # Count items expiring soon (within 30 days) and expired
        now = datetime.utcnow()
        thirty_days = now + timedelta(days=30)
        
        expiring_soon = individual_items_query.filter(
            InventoryItem.expiration_date.isnot(None),
            InventoryItem.expiration_date <= thirty_days,
            InventoryItem.expiration_date > now
        ).count()
        
        expired = individual_items_query.filter(
            InventoryItem.expiration_date.isnot(None),
            InventoryItem.expiration_date <= now
        ).count()
        
        expiration_info["expiring_soon_count"] = expiring_soon
        expiration_info["expired_count"] = expired
        
        item_dict = {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "category_id": item.category_id,
            "sku": item.item_code,  # Using item_code as sku
            "barcode": item.item_code,  # Using item_code as barcode
            "unit_of_measure": item.unit_of_measure,
            "unit_cost": float(item.cost_per_unit) if item.cost_per_unit else None,
            "is_controlled_substance": item.is_controlled_substance,
            "requires_prescription": False,  # Not in model, default to False
            "reorder_point": None,  # Not in Item model
            "reorder_quantity": None,  # Not in Item model
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "current_stock": int(current_stock),
            "par_level": par_level,
            "reorder_level": reorder_level,
            "location_name": location_name,
            "location_id": location_id_str,
            "category_name": category_name,
            "rfid_tag": item.item_code,  # Using item_code as rfid_tag
            "expiration_date": expiration_info["expiration_date"],
            "expiring_soon_count": expiration_info["expiring_soon_count"],
            "expired_count": expiration_info["expired_count"]
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
    # current_user: User = Depends(get_current_user),  # TEMP: Disabled for testing
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
    # current_user: User = Depends(get_current_user),  # TEMP: Disabled for testing
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
    print(f"DEBUG: Received update data: {update_data}")
    
    # Handle current_stock separately - update inventory table
    current_stock = update_data.pop('current_stock', None)
    location_id_for_update = update_data.pop('location_id', None)
    expiration_date = update_data.pop('expiration_date', None)
    print(f"DEBUG: Current stock from update data: {current_stock}, location_id: {location_id_for_update}")
    if current_stock is not None or expiration_date is not None:
        if location_id_for_update:
            # Update inventory for specific location
            inventory_record = db.query(InventoryCurrent).filter(
                InventoryCurrent.item_id == item_id,
                InventoryCurrent.location_id == location_id_for_update
            ).first()
            
            if inventory_record:
                print(f"DEBUG: Updating inventory record from {inventory_record.quantity_on_hand} to {current_stock}")
                if current_stock is not None:
                    inventory_record.quantity_on_hand = current_stock
                if expiration_date is not None:
                    inventory_record.expiration_date = expiration_date
            else:
                # Create inventory record for this location
                new_inventory = InventoryCurrent(
                    item_id=item_id,
                    location_id=location_id_for_update,
                    quantity_on_hand=current_stock if current_stock is not None else 0,
                    quantity_allocated=0,
                    expiration_date=expiration_date
                )
                db.add(new_inventory)
        else:
            # No location specified, update first record (fallback)
            inventory_record = db.query(InventoryCurrent).filter(
                InventoryCurrent.item_id == item_id
            ).first()
            if inventory_record:
                inventory_record.quantity_on_hand = current_stock
    
    # Handle par_level and reorder_level separately - update par_level table
    par_level = update_data.pop('par_level', None)
    reorder_level = update_data.pop('reorder_level', None)
    
    if par_level is not None or reorder_level is not None:
        if location_id_for_update:
            # Update par level for specific location
            par_level_record = db.query(ParLevel).filter(
                ParLevel.item_id == item_id,
                ParLevel.location_id == location_id_for_update
            ).first()
            if par_level_record:
                if par_level is not None:
                    par_level_record.par_quantity = par_level
                if reorder_level is not None:
                    par_level_record.reorder_quantity = reorder_level
            else:
                # Create par level for this location
                new_par = ParLevel(
                    item_id=item_id,
                    location_id=location_id_for_update,
                    par_quantity=par_level or 0,
                    reorder_quantity=reorder_level or 0
                )
                db.add(new_par)
        else:
            # No location specified, update first record (fallback)
            par_level_record = db.query(ParLevel).filter(ParLevel.item_id == item_id).first()
            if par_level_record:
                if par_level is not None:
                    par_level_record.par_quantity = par_level
                if reorder_level is not None:
                    par_level_record.reorder_quantity = reorder_level
    
    # Update remaining item fields
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
