"""
Inventory API Routes
Manages inventory levels, movements, and transfers between locations
"""
from typing import List, Optional, Annotated
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.inventory import InventoryCurrent
from app.models.par_level import ParLevel
from app.models.rfid import InventoryMovement, MovementType
from app.models.item import Item
from app.models.location import Location
from app.models.audit import AuditLog, AuditAction
from app.models.inventory_item import InventoryItem

router = APIRouter()


# Pydantic schemas
class InventoryCurrentResponse(BaseModel):
    id: UUID
    location_id: UUID
    item_id: UUID
    quantity_on_hand: int
    quantity_allocated: int
    quantity_available: int
    last_counted_at: Optional[datetime] = None
    last_counted_by_id: Optional[UUID] = None
    
    # Enriched data
    item_name: str
    item_code: str
    location_name: str
    unit_of_measure: str
    
    class Config:
        from_attributes = True


class PhysicalCountRequest(BaseModel):
    location_id: UUID
    item_id: UUID
    counted_quantity: int
    notes: Optional[str] = None


class InventoryTransferRequest(BaseModel):
    item_id: UUID
    from_location_id: UUID
    to_location_id: UUID
    quantity: int
    notes: Optional[str] = None


class BulkParLevelUpdate(BaseModel):
    item_ids: List[UUID]
    location_ids: List[UUID]
    par_level: Optional[int] = None
    reorder_level: Optional[int] = None


class InventoryMovementResponse(BaseModel):
    id: UUID
    item_id: UUID
    from_location_id: Optional[UUID]
    to_location_id: Optional[UUID]
    quantity: int
    movement_type: MovementType
    reference_number: Optional[str]
    notes: Optional[str]
    performed_by_id: UUID
    created_at: datetime
    
    # Enriched data
    item_name: str
    item_code: str
    from_location_name: Optional[str]
    to_location_name: Optional[str]
    performed_by_name: str
    
    class Config:
        from_attributes = True


@router.get("/current", response_model=List[InventoryCurrentResponse])
async def get_current_inventory(
    location_id: Optional[UUID] = None,
    item_id: Optional[UUID] = None,
    below_par: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current inventory levels across all locations or for specific location/item
    """
    query = db.query(InventoryCurrent)
    
    if location_id:
        query = query.filter(InventoryCurrent.location_id == location_id)
    if item_id:
        query = query.filter(InventoryCurrent.item_id == item_id)
    
    inventory_records = query.offset(skip).limit(limit).all()
    
    # Enrich with item and location data
    result = []
    for inv in inventory_records:
        item = db.query(Item).filter(Item.id == inv.item_id).first()
        location = db.query(Location).filter(Location.id == inv.location_id).first()
        
        if not item or not location:
            continue
        
        quantity_available = inv.quantity_on_hand - inv.quantity_allocated
        
        # Check if below par level if requested
        if below_par:
            from app.models.par_level import ParLevel
            par_level = db.query(ParLevel).filter(
                ParLevel.location_id == inv.location_id,
                ParLevel.item_id == inv.item_id
            ).first()
            
            if not par_level or quantity_available >= par_level.par_quantity:
                continue
        
        result.append(InventoryCurrentResponse(
            id=inv.id,
            location_id=inv.location_id,
            item_id=inv.item_id,
            quantity_on_hand=inv.quantity_on_hand,
            quantity_allocated=inv.quantity_allocated,
            quantity_available=quantity_available,
            last_counted_at=inv.last_counted_at,
            last_counted_by_id=inv.last_counted_by_id,
            item_name=item.name,
            item_code=item.item_code,
            location_name=location.name,
            unit_of_measure=item.unit_of_measure
        ))
    
    return result


@router.post("/count")
async def physical_count(
    count_data: PhysicalCountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform physical inventory count - updates quantity and creates adjustment movement
    """
    # Get or create inventory record
    inventory = db.query(InventoryCurrent).filter(
        InventoryCurrent.location_id == count_data.location_id,
        InventoryCurrent.item_id == count_data.item_id
    ).first()
    
    if not inventory:
        # Create new inventory record
        inventory = InventoryCurrent(
            location_id=count_data.location_id,
            item_id=count_data.item_id,
            quantity_on_hand=count_data.counted_quantity,
            quantity_allocated=0,
            last_counted_at=datetime.utcnow(),
            last_counted_by_id=current_user.id
        )
        db.add(inventory)
        
        # Create receipt movement
        movement = InventoryMovement(
            item_id=count_data.item_id,
            to_location_id=count_data.location_id,
            quantity=count_data.counted_quantity,
            movement_type=MovementType.RECEIPT,
            notes=f"Initial count: {count_data.notes}" if count_data.notes else "Initial physical count",
            performed_by_id=current_user.id
        )
        db.add(movement)
    else:
        # Calculate adjustment
        old_quantity = inventory.quantity_on_hand
        adjustment = count_data.counted_quantity - old_quantity
        
        if adjustment != 0:
            # Update inventory
            inventory.quantity_on_hand = count_data.counted_quantity
            inventory.last_counted_at = datetime.utcnow()
            inventory.last_counted_by_id = current_user.id
            
            # Create adjustment movement
            movement = InventoryMovement(
                item_id=count_data.item_id,
                to_location_id=count_data.location_id if adjustment > 0 else None,
                from_location_id=count_data.location_id if adjustment < 0 else None,
                quantity=abs(adjustment),
                movement_type=MovementType.ADJUSTMENT,
                notes=f"Physical count adjustment (was {old_quantity}, counted {count_data.counted_quantity}). {count_data.notes or ''}",
                performed_by_id=current_user.id
            )
            db.add(movement)
    
    # Create audit log
    item = db.query(Item).filter(Item.id == count_data.item_id).first()
    location = db.query(Location).filter(Location.id == count_data.location_id).first()
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="inventory",
        entity_id=inventory.id if inventory else None,
        description=f"Physical count: {item.name} at {location.name} = {count_data.counted_quantity}",
        ip_address="127.0.0.1"  # TODO: Get real IP
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(inventory)
    
    return {
        "message": "Physical count recorded successfully",
        "inventory_id": inventory.id,
        "new_quantity": inventory.quantity_on_hand
    }


@router.post("/transfer")
async def transfer_inventory(
    transfer_data: InventoryTransferRequest,
    # current_user: User = Depends(get_current_user),  # TEMP: Disabled for testing
    db: Session = Depends(get_db)
):
    """
    Transfer items between locations (e.g., Supply Station → Cabinet → Vehicle)
    """
    # Validate locations
    from_location = db.query(Location).filter(
        Location.id == transfer_data.from_location_id
    ).first()
    to_location = db.query(Location).filter(
        Location.id == transfer_data.to_location_id
    ).first()
    
    if not from_location or not to_location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if transfer_data.from_location_id == transfer_data.to_location_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to same location")
    
    # Get source inventory
    from_inventory = db.query(InventoryCurrent).filter(
        InventoryCurrent.location_id == transfer_data.from_location_id,
        InventoryCurrent.item_id == transfer_data.item_id
    ).first()
    
    if not from_inventory:
        raise HTTPException(
            status_code=404,
            detail="Item not found in source location"
        )
    
    # Check available quantity
    available = from_inventory.quantity_on_hand - from_inventory.quantity_allocated
    if available < transfer_data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient quantity. Available: {available}, Requested: {transfer_data.quantity}"
        )
    
    # Decrease from source
    from_inventory.quantity_on_hand -= transfer_data.quantity
    
    # Increase in destination (create if doesn't exist)
    to_inventory = db.query(InventoryCurrent).filter(
        InventoryCurrent.location_id == transfer_data.to_location_id,
        InventoryCurrent.item_id == transfer_data.item_id
    ).first()
    
    if not to_inventory:
        to_inventory = InventoryCurrent(
            location_id=transfer_data.to_location_id,
            item_id=transfer_data.item_id,
            quantity_on_hand=transfer_data.quantity,
            quantity_allocated=0
        )
        db.add(to_inventory)
    else:
        to_inventory.quantity_on_hand += transfer_data.quantity
    
    # TEMP: Skip movement and audit records when auth is disabled
    # Create movement record
    # movement = InventoryMovement(
    #     item_id=transfer_data.item_id,
    #     from_location_id=transfer_data.from_location_id,
    #     to_location_id=transfer_data.to_location_id,
    #     quantity=transfer_data.quantity,
    #     movement_type=MovementType.TRANSFER,
    #     notes=transfer_data.notes,
    #     performed_by_id=current_user.id
    # )
    # db.add(movement)
    
    # Create audit log
    # item = db.query(Item).filter(Item.id == transfer_data.item_id).first()
    # audit_log = AuditLog(
    #     user_id=current_user.id,
    #     action=AuditAction.UPDATE,
    #     entity_type="inventory",
    #     entity_id=movement.id,
    #     description=f"Transferred {transfer_data.quantity} {item.name} from {from_location.name} to {to_location.name}",
    #     ip_address="127.0.0.1"
    # )
    # db.add(audit_log)
    
    db.commit()
    
    return {
        "message": "Transfer completed successfully",
        "from_location": from_location.name,
        "to_location": to_location.name,
        "quantity": transfer_data.quantity
    }


@router.get("/movements", response_model=List[InventoryMovementResponse])
async def get_movements(
    location_id: Optional[UUID] = None,
    item_id: Optional[UUID] = None,
    movement_type: Optional[MovementType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get inventory movement history with filters
    """
    query = db.query(InventoryMovement)
    
    # Apply filters
    if location_id:
        query = query.filter(
            (InventoryMovement.from_location_id == location_id) |
            (InventoryMovement.to_location_id == location_id)
        )
    if item_id:
        query = query.filter(InventoryMovement.item_id == item_id)
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)
    if start_date:
        query = query.filter(InventoryMovement.created_at >= start_date)
    if end_date:
        query = query.filter(InventoryMovement.created_at <= end_date)
    
    movements = query.order_by(desc(InventoryMovement.created_at)).offset(skip).limit(limit).all()
    
    # Enrich with related data
    result = []
    for mov in movements:
        item = db.query(Item).filter(Item.id == mov.item_id).first()
        from_loc = db.query(Location).filter(Location.id == mov.from_location_id).first() if mov.from_location_id else None
        to_loc = db.query(Location).filter(Location.id == mov.to_location_id).first() if mov.to_location_id else None
        user = db.query(User).filter(User.id == mov.performed_by_id).first()
        
        result.append(InventoryMovementResponse(
            id=mov.id,
            item_id=mov.item_id,
            from_location_id=mov.from_location_id,
            to_location_id=mov.to_location_id,
            quantity=mov.quantity,
            movement_type=mov.movement_type,
            reference_number=mov.reference_number,
            notes=mov.notes,
            performed_by_id=mov.performed_by_id,
            created_at=mov.created_at,
            item_name=item.name if item else "Unknown",
            item_code=item.item_code if item else "Unknown",
            from_location_name=from_loc.name if from_loc else None,
            to_location_name=to_loc.name if to_loc else None,
            performed_by_name=f"{user.first_name} {user.last_name}" if user else "Unknown"
        ))
    
    return result


@router.get("/low-stock", response_model=List[InventoryCurrentResponse])
async def get_low_stock_items(
    location_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get items that are below their par levels
    """
    return await get_current_inventory(
        location_id=location_id,
        below_par=True,
        current_user=current_user,
        db=db
    )


@router.post("/bulk-par-levels")
async def bulk_update_par_levels(
    update_data: BulkParLevelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bulk update par levels for multiple items across multiple locations
    """
    if not update_data.par_level and not update_data.reorder_level:
        raise HTTPException(status_code=400, detail="Must provide at least one value to update")
    
    updated_count = 0
    created_count = 0
    
    for item_id in update_data.item_ids:
        # Verify item exists
        item = db.query(Item).filter(Item.id == item_id).first()
        if not item:
            continue
        
        for location_id in update_data.location_ids:
            # Verify location exists
            location = db.query(Location).filter(Location.id == location_id).first()
            if not location:
                continue
            
            # Find or create par level
            par_level = db.query(ParLevel).filter(
                ParLevel.item_id == item_id,
                ParLevel.location_id == location_id
            ).first()
            
            if par_level:
                # Update existing
                if update_data.par_level is not None:
                    par_level.par_quantity = update_data.par_level
                if update_data.reorder_level is not None:
                    par_level.reorder_quantity = update_data.reorder_level
                par_level.updated_at = datetime.utcnow()
                updated_count += 1
            else:
                # Create new
                par_level = ParLevel(
                    item_id=item_id,
                    location_id=location_id,
                    par_quantity=update_data.par_level if update_data.par_level is not None else 0,
                    reorder_quantity=update_data.reorder_level if update_data.reorder_level is not None else 0
                )
                db.add(par_level)
                created_count += 1
    
    db.commit()
    
    return {
        "message": "Par levels updated successfully",
        "updated": updated_count,
        "created": created_count,
        "total_items": len(update_data.item_ids),
        "total_locations": len(update_data.location_ids)
    }


class ExpiringItemResponse(BaseModel):
    id: int
    item_id: UUID
    location_id: UUID
    rfid_tag: str
    expiration_date: datetime
    lot_number: Optional[str]
    days_until_expiration: int
    
    # Enriched data
    item_name: str
    item_code: str
    location_name: str
    category_name: Optional[str]
    
    class Config:
        from_attributes = True


@router.get("/expiring-items", response_model=List[ExpiringItemResponse])
async def get_expiring_items(
    days_ahead: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
    location_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get items expiring within the specified number of days
    
    Args:
        days_ahead: Number of days to look ahead (default 30)
        location_id: Filter by specific location
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of expiring items with enriched data
    """
    from datetime import timedelta
    
    # Calculate cutoff date
    cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)
    
    # Build query
    query = db.query(InventoryItem).filter(
        InventoryItem.expiration_date.isnot(None),
        InventoryItem.expiration_date <= cutoff_date,
        InventoryItem.expiration_date >= datetime.utcnow()  # Exclude already expired
    )
    
    if location_id:
        query = query.filter(InventoryItem.location_id == location_id)
    
    # Order by expiration date (soonest first)
    query = query.order_by(InventoryItem.expiration_date)
    
    items = query.offset(skip).limit(limit).all()
    
    # Enrich with item and location data
    results = []
    for inv_item in items:
        item = db.query(Item).filter(Item.id == inv_item.item_id).first()
        location = db.query(Location).filter(Location.id == inv_item.location_id).first()
        
        if not item or not location:
            continue
        
        # Calculate days until expiration
        days_until = (inv_item.expiration_date - datetime.utcnow()).days
        
        result = ExpiringItemResponse(
            id=inv_item.id,
            item_id=inv_item.item_id,
            location_id=inv_item.location_id,
            rfid_tag=inv_item.rfid_tag,
            expiration_date=inv_item.expiration_date,
            lot_number=inv_item.lot_number,
            days_until_expiration=days_until,
            item_name=item.name,
            item_code=item.item_code,
            location_name=location.name,
            category_name=item.category.name if item.category else None
        )
        results.append(result)
    
    return results


@router.get("/expired-items", response_model=List[ExpiringItemResponse])
async def get_expired_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    location_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get items that have already expired
    
    Args:
        location_id: Filter by specific location
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of expired items with enriched data
    """
    # Build query for expired items
    query = db.query(InventoryItem).filter(
        InventoryItem.expiration_date.isnot(None),
        InventoryItem.expiration_date < datetime.utcnow()
    )
    
    if location_id:
        query = query.filter(InventoryItem.location_id == location_id)
    
    # Order by expiration date (oldest first)
    query = query.order_by(InventoryItem.expiration_date)
    
    items = query.offset(skip).limit(limit).all()
    
    # Enrich with item and location data
    results = []
    for inv_item in items:
        item = db.query(Item).filter(Item.id == inv_item.item_id).first()
        location = db.query(Location).filter(Location.id == inv_item.location_id).first()
        
        if not item or not location:
            continue
        
        # Calculate days since expiration (negative number)
        days_until = (inv_item.expiration_date - datetime.utcnow()).days
        
        result = ExpiringItemResponse(
            id=inv_item.id,
            item_id=inv_item.item_id,
            location_id=inv_item.location_id,
            rfid_tag=inv_item.rfid_tag,
            expiration_date=inv_item.expiration_date,
            lot_number=inv_item.lot_number,
            days_until_expiration=days_until,
            item_name=item.name,
            item_code=item.item_code,
            location_name=location.name,
            category_name=item.category.name if item.category else None
        )
        results.append(result)
    
    return results

