"""
RFID/Scanning API Routes
Supports RFID tags and barcodes for Zebra TC22/27 scanners
Handles item tracking, scanning, and location-based movements
"""
from typing import List, Optional, Annotated
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.rfid import RFIDTag, TagStatus, InventoryMovement, MovementType
from app.models.item import Item
from app.models.location import Location
from app.models.inventory import InventoryCurrent
from app.models.audit import AuditLog, AuditAction

router = APIRouter()


# Pydantic schemas
class RFIDTagCreate(BaseModel):
    tag_id: str  # RFID tag ID or barcode
    item_id: UUID
    current_location_id: Optional[UUID] = None
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None
    expiration_date: Optional[datetime] = None


class RFIDTagResponse(BaseModel):
    id: UUID
    tag_id: str
    item_id: UUID
    current_location_id: Optional[UUID]
    status: TagStatus
    lot_number: Optional[str]
    serial_number: Optional[str]
    expiration_date: Optional[datetime]
    assigned_date: datetime
    last_scanned_at: Optional[datetime]
    
    # Enriched data
    item_name: str
    item_code: str
    location_name: Optional[str]
    unit_of_measure: str
    
    class Config:
        from_attributes = True


class ScanRequest(BaseModel):
    """Request from scanner device (Zebra TC22/27)"""
    tag_id: str  # RFID/barcode value scanned
    scanner_location_id: Optional[UUID] = None  # Current scanner location
    scan_type: str = "barcode"  # "rfid" or "barcode"


class ScanResponse(BaseModel):
    """Response to scanner with item information"""
    success: bool
    tag_info: Optional[RFIDTagResponse] = None
    item_info: Optional[dict] = None
    message: str
    suggested_action: Optional[str] = None


class MoveItemRequest(BaseModel):
    """Move item via RFID scan"""
    tag_id: str
    to_location_id: UUID
    quantity: int = 1
    notes: Optional[str] = None


class LinkTagRequest(BaseModel):
    """Associate RFID tag with item"""
    tag_id: str
    item_id: UUID
    location_id: UUID
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None
    expiration_date: Optional[datetime] = None


@router.post("/scan", response_model=ScanResponse)
async def scan_tag(
    scan_data: ScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scan RFID tag or barcode
    Returns item information and current location
    For Zebra TC22/27 scanner integration
    """
    # Try to find RFID tag
    rfid_tag = db.query(RFIDTag).filter(
        RFIDTag.tag_id == scan_data.tag_id,
        RFIDTag.status == TagStatus.ACTIVE
    ).first()
    
    if rfid_tag:
        # Update last scanned time
        rfid_tag.last_scanned_at = datetime.utcnow()
        db.commit()
        
        # Get item and location info
        item = db.query(Item).filter(Item.id == rfid_tag.item_id).first()
        location = db.query(Location).filter(
            Location.id == rfid_tag.current_location_id
        ).first() if rfid_tag.current_location_id else None
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        tag_response = RFIDTagResponse(
            id=rfid_tag.id,
            tag_id=rfid_tag.tag_id,
            item_id=rfid_tag.item_id,
            current_location_id=rfid_tag.current_location_id,
            status=rfid_tag.status,
            lot_number=rfid_tag.lot_number,
            serial_number=rfid_tag.serial_number,
            expiration_date=rfid_tag.expiration_date,
            assigned_date=rfid_tag.assigned_date,
            last_scanned_at=rfid_tag.last_scanned_at,
            item_name=item.name,
            item_code=item.item_code,
            location_name=location.name if location else None,
            unit_of_measure=item.unit_of_measure
        )
        
        # Get current inventory
        inventory = db.query(InventoryCurrent).filter(
            InventoryCurrent.location_id == rfid_tag.current_location_id,
            InventoryCurrent.item_id == rfid_tag.item_id
        ).first() if rfid_tag.current_location_id else None
        
        item_info = {
            "name": item.name,
            "code": item.item_code,
            "description": item.description,
            "current_location": location.name if location else "Unknown",
            "quantity_on_hand": inventory.quantity_on_hand if inventory else 0,
            "is_controlled_substance": item.is_controlled_substance,
            "expiration_date": rfid_tag.expiration_date.isoformat() if rfid_tag.expiration_date else None,
            "lot_number": rfid_tag.lot_number
        }
        
        # Determine suggested action
        suggested_action = "transfer"  # Default action for scanned items
        if rfid_tag.expiration_date and rfid_tag.expiration_date < datetime.utcnow():
            suggested_action = "expired_remove"
        
        return ScanResponse(
            success=True,
            tag_info=tag_response,
            item_info=item_info,
            message=f"Item scanned: {item.name}",
            suggested_action=suggested_action
        )
    else:
        # Tag not found - might be a barcode for an item without individual tracking
        # Try to find item by barcode
        item = db.query(Item).filter(Item.barcode == scan_data.tag_id).first()
        
        if item:
            # Found item by barcode but no individual tag
            return ScanResponse(
                success=True,
                tag_info=None,
                item_info={
                    "name": item.name,
                    "code": item.item_code,
                    "description": item.description
                },
                message=f"Item found: {item.name}. No individual tag assigned.",
                suggested_action="link_tag"
            )
        else:
            # Not found at all
            return ScanResponse(
                success=False,
                tag_info=None,
                item_info=None,
                message=f"Tag/barcode not found: {scan_data.tag_id}",
                suggested_action="create_tag"
            )


@router.post("/link", response_model=RFIDTagResponse)
async def link_tag_to_item(
    link_data: LinkTagRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Link/assign an RFID tag to an item
    Used when receiving new supplies with tags
    """
    # Verify item exists
    item = db.query(Item).filter(Item.id == link_data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if tag already exists
    existing_tag = db.query(RFIDTag).filter(RFIDTag.tag_id == link_data.tag_id).first()
    if existing_tag:
        if existing_tag.status == TagStatus.ACTIVE:
            raise HTTPException(
                status_code=400,
                detail=f"Tag already assigned to item: {existing_tag.item_id}"
            )
        else:
            # Reactivate retired tag
            existing_tag.status = TagStatus.ACTIVE
            existing_tag.item_id = link_data.item_id
            existing_tag.current_location_id = link_data.location_id
            existing_tag.lot_number = link_data.lot_number
            existing_tag.serial_number = link_data.serial_number
            existing_tag.expiration_date = link_data.expiration_date
            existing_tag.assigned_date = datetime.utcnow()
            rfid_tag = existing_tag
    else:
        # Create new tag
        rfid_tag = RFIDTag(
            tag_id=link_data.tag_id,
            item_id=link_data.item_id,
            current_location_id=link_data.location_id,
            status=TagStatus.ACTIVE,
            lot_number=link_data.lot_number,
            serial_number=link_data.serial_number,
            expiration_date=link_data.expiration_date,
            assigned_date=datetime.utcnow()
        )
        db.add(rfid_tag)
    
    # Update inventory at location
    inventory = db.query(InventoryCurrent).filter(
        InventoryCurrent.location_id == link_data.location_id,
        InventoryCurrent.item_id == link_data.item_id
    ).first()
    
    if inventory:
        inventory.quantity_on_hand += 1
    else:
        inventory = InventoryCurrent(
            location_id=link_data.location_id,
            item_id=link_data.item_id,
            quantity_on_hand=1,
            quantity_allocated=0
        )
        db.add(inventory)
    
    # Create receipt movement
    movement = InventoryMovement(
        item_id=link_data.item_id,
        to_location_id=link_data.location_id,
        quantity=1,
        movement_type=MovementType.RECEIPT,
        reference_number=link_data.tag_id,
        notes=f"RFID tag linked: {link_data.tag_id}",
        performed_by_id=current_user.id
    )
    db.add(movement)
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="rfid_tag",
        entity_id=rfid_tag.id,
        description=f"RFID tag {link_data.tag_id} assigned to {item.name}",
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(rfid_tag)
    
    location = db.query(Location).filter(Location.id == link_data.location_id).first()
    
    return RFIDTagResponse(
        id=rfid_tag.id,
        tag_id=rfid_tag.tag_id,
        item_id=rfid_tag.item_id,
        current_location_id=rfid_tag.current_location_id,
        status=rfid_tag.status,
        lot_number=rfid_tag.lot_number,
        serial_number=rfid_tag.serial_number,
        expiration_date=rfid_tag.expiration_date,
        assigned_date=rfid_tag.assigned_date,
        last_scanned_at=rfid_tag.last_scanned_at,
        item_name=item.name,
        item_code=item.item_code,
        location_name=location.name if location else None,
        unit_of_measure=item.unit_of_measure
    )


@router.post("/move")
async def move_item_by_scan(
    move_data: MoveItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Move item to new location via RFID scan
    Typical workflow: Scan item → Scan destination location QR code → Move
    """
    # Find RFID tag
    rfid_tag = db.query(RFIDTag).filter(
        RFIDTag.tag_id == move_data.tag_id,
        RFIDTag.status == TagStatus.ACTIVE
    ).first()
    
    if not rfid_tag:
        raise HTTPException(status_code=404, detail="RFID tag not found")
    
    # Verify destination location
    to_location = db.query(Location).filter(
        Location.id == move_data.to_location_id
    ).first()
    if not to_location:
        raise HTTPException(status_code=404, detail="Destination location not found")
    
    from_location_id = rfid_tag.current_location_id
    
    if from_location_id == move_data.to_location_id:
        raise HTTPException(status_code=400, detail="Item already at this location")
    
    # Update tag location
    rfid_tag.current_location_id = move_data.to_location_id
    rfid_tag.last_scanned_at = datetime.utcnow()
    
    # Update inventory counts if moving from a location
    if from_location_id:
        from_inventory = db.query(InventoryCurrent).filter(
            InventoryCurrent.location_id == from_location_id,
            InventoryCurrent.item_id == rfid_tag.item_id
        ).first()
        
        if from_inventory and from_inventory.quantity_on_hand >= move_data.quantity:
            from_inventory.quantity_on_hand -= move_data.quantity
    
    # Update destination inventory
    to_inventory = db.query(InventoryCurrent).filter(
        InventoryCurrent.location_id == move_data.to_location_id,
        InventoryCurrent.item_id == rfid_tag.item_id
    ).first()
    
    if to_inventory:
        to_inventory.quantity_on_hand += move_data.quantity
    else:
        to_inventory = InventoryCurrent(
            location_id=move_data.to_location_id,
            item_id=rfid_tag.item_id,
            quantity_on_hand=move_data.quantity,
            quantity_allocated=0
        )
        db.add(to_inventory)
    
    # Create movement record
    movement = InventoryMovement(
        item_id=rfid_tag.item_id,
        from_location_id=from_location_id,
        to_location_id=move_data.to_location_id,
        quantity=move_data.quantity,
        movement_type=MovementType.TRANSFER,
        reference_number=move_data.tag_id,
        notes=f"RFID scan move: {move_data.notes or ''}",
        performed_by_id=current_user.id
    )
    db.add(movement)
    
    db.commit()
    
    from_location = db.query(Location).filter(Location.id == from_location_id).first() if from_location_id else None
    
    return {
        "success": True,
        "message": f"Item moved to {to_location.name}",
        "from_location": from_location.name if from_location else "Unknown",
        "to_location": to_location.name,
        "tag_id": move_data.tag_id,
        "movement_id": movement.id
    }


@router.get("/{tag_id}", response_model=RFIDTagResponse)
async def get_tag_info(
    tag_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about a specific RFID tag
    """
    rfid_tag = db.query(RFIDTag).filter(RFIDTag.tag_id == tag_id).first()
    
    if not rfid_tag:
        raise HTTPException(status_code=404, detail="RFID tag not found")
    
    item = db.query(Item).filter(Item.id == rfid_tag.item_id).first()
    location = db.query(Location).filter(
        Location.id == rfid_tag.current_location_id
    ).first() if rfid_tag.current_location_id else None
    
    return RFIDTagResponse(
        id=rfid_tag.id,
        tag_id=rfid_tag.tag_id,
        item_id=rfid_tag.item_id,
        current_location_id=rfid_tag.current_location_id,
        status=rfid_tag.status,
        lot_number=rfid_tag.lot_number,
        serial_number=rfid_tag.serial_number,
        expiration_date=rfid_tag.expiration_date,
        assigned_date=rfid_tag.assigned_date,
        last_scanned_at=rfid_tag.last_scanned_at,
        item_name=item.name if item else "Unknown",
        item_code=item.item_code if item else "Unknown",
        location_name=location.name if location else None,
        unit_of_measure=item.unit_of_measure if item else "EA"
    )


@router.get("/item/{item_id}/tags", response_model=List[RFIDTagResponse])
async def get_item_tags(
    item_id: UUID,
    status: Optional[TagStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all RFID tags for a specific item
    """
    query = db.query(RFIDTag).filter(RFIDTag.item_id == item_id)
    
    if status:
        query = query.filter(RFIDTag.status == status)
    
    tags = query.all()
    
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    result = []
    for tag in tags:
        location = db.query(Location).filter(
            Location.id == tag.current_location_id
        ).first() if tag.current_location_id else None
        
        result.append(RFIDTagResponse(
            id=tag.id,
            tag_id=tag.tag_id,
            item_id=tag.item_id,
            current_location_id=tag.current_location_id,
            status=tag.status,
            lot_number=tag.lot_number,
            serial_number=tag.serial_number,
            expiration_date=tag.expiration_date,
            assigned_date=tag.assigned_date,
            last_scanned_at=tag.last_scanned_at,
            item_name=item.name,
            item_code=item.item_code,
            location_name=location.name if location else None,
            unit_of_measure=item.unit_of_measure
        ))
    
    return result
