"""
Individual Inventory Items API Routes
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.inventory_item import InventoryItem
from app.models.item import Item
from app.models.location import Location
from app.models.inventory import InventoryCurrent
from app.schemas.inventory_item import (
    InventoryItemCreate,
    InventoryItemBulkCreate,
    InventoryItemResponse,
    InventoryItemListResponse,
    InventoryItemUpdate
)

router = APIRouter()


@router.get("/{item_id}/{location_id}", response_model=InventoryItemListResponse)
async def get_individual_items(
    item_id: UUID,
    location_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get all individual items for a specific item at a specific location
    Returns RFID tags, expiration dates, lot numbers, etc.
    """
    # Verify item and location exist
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Get all individual items
    individual_items = db.query(InventoryItem).filter(
        and_(
            InventoryItem.item_id == item_id,
            InventoryItem.location_id == location_id
        )
    ).order_by(InventoryItem.expiration_date.asc().nulls_last()).all()
    
    # Build response with item and location names
    items_response = []
    for inv_item in individual_items:
        items_response.append(InventoryItemResponse(
            id=inv_item.id,
            item_id=inv_item.item_id,
            location_id=inv_item.location_id,
            rfid_tag=inv_item.rfid_tag,
            expiration_date=inv_item.expiration_date,
            lot_number=inv_item.lot_number,
            received_date=inv_item.received_date,
            created_at=inv_item.created_at,
            updated_at=inv_item.updated_at,
            item_name=item.name,
            location_name=location.name
        ))
    
    # Calculate summary stats
    total_count = len(items_response)
    
    # Count items expiring within 30 days
    thirty_days_from_now = datetime.utcnow() + timedelta(days=30)
    expiring_soon_count = sum(
        1 for item in individual_items 
        if item.expiration_date and item.expiration_date <= thirty_days_from_now
    )
    
    # Get earliest expiration date
    earliest_expiration = None
    if individual_items and individual_items[0].expiration_date:
        earliest_expiration = individual_items[0].expiration_date
    
    return InventoryItemListResponse(
        items=items_response,
        total_count=total_count,
        expiring_soon_count=expiring_soon_count,
        earliest_expiration=earliest_expiration
    )


@router.post("/", response_model=InventoryItemResponse)
async def create_individual_item(
    item_data: InventoryItemCreate,
    db: Session = Depends(get_db)
):
    """
    Add a single individual item with RFID tag and expiration date
    """
    # Verify item and location exist
    item = db.query(Item).filter(Item.id == item_data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    location = db.query(Location).filter(Location.id == item_data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Check if RFID tag already exists
    existing_tag = db.query(InventoryItem).filter(
        InventoryItem.rfid_tag == item_data.rfid_tag
    ).first()
    if existing_tag:
        raise HTTPException(status_code=400, detail=f"RFID tag {item_data.rfid_tag} already exists")
    
    # Create the individual item
    new_item = InventoryItem(
        item_id=item_data.item_id,
        location_id=item_data.location_id,
        rfid_tag=item_data.rfid_tag,
        expiration_date=item_data.expiration_date,
        lot_number=item_data.lot_number,
        received_date=item_data.received_date or datetime.utcnow()
    )
    
    db.add(new_item)
    
    # Update or create inventory_current aggregate
    inventory_current = db.query(InventoryCurrent).filter(
        and_(
            InventoryCurrent.item_id == item_data.item_id,
            InventoryCurrent.location_id == item_data.location_id
        )
    ).first()
    
    if inventory_current:
        inventory_current.quantity_on_hand += 1
    else:
        inventory_current = InventoryCurrent(
            item_id=item_data.item_id,
            location_id=item_data.location_id,
            quantity_on_hand=1
        )
        db.add(inventory_current)
    
    db.commit()
    db.refresh(new_item)
    
    return InventoryItemResponse(
        id=new_item.id,
        item_id=new_item.item_id,
        location_id=new_item.location_id,
        rfid_tag=new_item.rfid_tag,
        expiration_date=new_item.expiration_date,
        lot_number=new_item.lot_number,
        received_date=new_item.received_date,
        created_at=new_item.created_at,
        updated_at=new_item.updated_at,
        item_name=item.name,
        location_name=location.name
    )


@router.post("/bulk", response_model=List[InventoryItemResponse])
async def create_bulk_items(
    bulk_data: InventoryItemBulkCreate,
    db: Session = Depends(get_db)
):
    """
    Add multiple items at once (e.g., bag of 5 with same expiration date)
    Generates sequential RFID tags if prefix is provided
    """
    # Verify item and location exist
    item = db.query(Item).filter(Item.id == bulk_data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    location = db.query(Location).filter(Location.id == bulk_data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if bulk_data.quantity < 1 or bulk_data.quantity > 1000:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 1000")
    
    # Generate RFID tags
    created_items = []
    received_date = bulk_data.received_date or datetime.utcnow()
    
    for i in range(bulk_data.quantity):
        # Generate RFID tag
        if bulk_data.rfid_tag_prefix:
            rfid_tag = f"{bulk_data.rfid_tag_prefix}-{i+1:03d}"
        else:
            # Generate random tag
            import secrets
            rfid_tag = f"ITEM-{secrets.token_hex(8).upper()}"
        
        # Check if tag exists (shouldn't happen with random generation)
        existing_tag = db.query(InventoryItem).filter(
            InventoryItem.rfid_tag == rfid_tag
        ).first()
        if existing_tag:
            raise HTTPException(status_code=400, detail=f"RFID tag {rfid_tag} already exists")
        
        # Create individual item
        new_item = InventoryItem(
            item_id=bulk_data.item_id,
            location_id=bulk_data.location_id,
            rfid_tag=rfid_tag,
            expiration_date=bulk_data.expiration_date,
            lot_number=bulk_data.lot_number,
            received_date=received_date
        )
        
        db.add(new_item)
        created_items.append(new_item)
    
    # Update inventory_current aggregate
    inventory_current = db.query(InventoryCurrent).filter(
        and_(
            InventoryCurrent.item_id == bulk_data.item_id,
            InventoryCurrent.location_id == bulk_data.location_id
        )
    ).first()
    
    if inventory_current:
        inventory_current.quantity_on_hand += bulk_data.quantity
    else:
        inventory_current = InventoryCurrent(
            item_id=bulk_data.item_id,
            location_id=bulk_data.location_id,
            quantity_on_hand=bulk_data.quantity
        )
        db.add(inventory_current)
    
    db.commit()
    
    # Build response
    response_items = []
    for created_item in created_items:
        db.refresh(created_item)
        response_items.append(InventoryItemResponse(
            id=created_item.id,
            item_id=created_item.item_id,
            location_id=created_item.location_id,
            rfid_tag=created_item.rfid_tag,
            expiration_date=created_item.expiration_date,
            lot_number=created_item.lot_number,
            received_date=created_item.received_date,
            created_at=created_item.created_at,
            updated_at=created_item.updated_at,
            item_name=item.name,
            location_name=location.name
        ))
    
    return response_items


@router.delete("/{item_id}")
async def delete_individual_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific individual item (e.g., when expired or used)
    Also updates inventory_current aggregate count
    """
    individual_item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not individual_item:
        raise HTTPException(status_code=404, detail="Individual item not found")
    
    # Update inventory_current aggregate
    inventory_current = db.query(InventoryCurrent).filter(
        and_(
            InventoryCurrent.item_id == individual_item.item_id,
            InventoryCurrent.location_id == individual_item.location_id
        )
    ).first()
    
    if inventory_current:
        inventory_current.quantity_on_hand = max(0, inventory_current.quantity_on_hand - 1)
    
    db.delete(individual_item)
    db.commit()
    
    return {"message": "Individual item deleted successfully"}


@router.patch("/{item_id}", response_model=InventoryItemResponse)
async def update_individual_item(
    item_id: int,
    update_data: InventoryItemUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an individual item (e.g., change expiration date or move to new location)
    """
    individual_item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not individual_item:
        raise HTTPException(status_code=404, detail="Individual item not found")
    
    # If moving to a new location, update inventory_current for both locations
    if update_data.location_id and update_data.location_id != individual_item.location_id:
        # Verify new location exists
        new_location = db.query(Location).filter(Location.id == update_data.location_id).first()
        if not new_location:
            raise HTTPException(status_code=404, detail="New location not found")
        
        # Decrease count at old location
        old_inventory = db.query(InventoryCurrent).filter(
            and_(
                InventoryCurrent.item_id == individual_item.item_id,
                InventoryCurrent.location_id == individual_item.location_id
            )
        ).first()
        if old_inventory:
            old_inventory.quantity_on_hand = max(0, old_inventory.quantity_on_hand - 1)
        
        # Increase count at new location
        new_inventory = db.query(InventoryCurrent).filter(
            and_(
                InventoryCurrent.item_id == individual_item.item_id,
                InventoryCurrent.location_id == update_data.location_id
            )
        ).first()
        if new_inventory:
            new_inventory.quantity_on_hand += 1
        else:
            new_inventory = InventoryCurrent(
                item_id=individual_item.item_id,
                location_id=update_data.location_id,
                quantity_on_hand=1
            )
            db.add(new_inventory)
        
        individual_item.location_id = update_data.location_id
    
    # Update other fields
    if update_data.expiration_date is not None:
        individual_item.expiration_date = update_data.expiration_date
    
    if update_data.lot_number is not None:
        individual_item.lot_number = update_data.lot_number
    
    individual_item.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(individual_item)
    
    # Get item and location names
    item = db.query(Item).filter(Item.id == individual_item.item_id).first()
    location = db.query(Location).filter(Location.id == individual_item.location_id).first()
    
    return InventoryItemResponse(
        id=individual_item.id,
        item_id=individual_item.item_id,
        location_id=individual_item.location_id,
        rfid_tag=individual_item.rfid_tag,
        expiration_date=individual_item.expiration_date,
        lot_number=individual_item.lot_number,
        received_date=individual_item.received_date,
        created_at=individual_item.created_at,
        updated_at=individual_item.updated_at,
        item_name=item.name if item else None,
        location_name=location.name if location else None
    )
