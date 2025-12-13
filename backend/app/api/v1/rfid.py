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

    @classmethod
    def validate_tag_id(cls, tag_id: str) -> str:
        """Validate and clean tag ID"""
        if not tag_id or not tag_id.strip():
            raise ValueError("Tag ID cannot be empty")
        # Remove whitespace and convert to uppercase for consistency
        clean_id = tag_id.strip().upper()
        # Validate length (EPC tags are typically 24-96 bits hex = 6-24 chars)
        if len(clean_id) > 255:
            raise ValueError("Tag ID too long (max 255 characters)")
        # Basic hex validation for RFID tags (can be extended)
        if len(clean_id) <= 48:  # Likely an EPC tag
            # Allow hex characters and some common barcode characters
            allowed = set("0123456789ABCDEF-")
            if not all(c in allowed for c in clean_id):
                # Not pure hex, might be barcode - allow alphanumeric
                pass
        return clean_id


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


class ReceiveStockRequest(BaseModel):
    """Receive stock into Supply Station via barcode/RFID scan"""
    barcode: str  # Item barcode or RFID tag
    quantity: int = 1
    location_id: Optional[UUID] = None  # Defaults to Supply Station
    lot_number: Optional[str] = None
    expiration_date: Optional[datetime] = None
    purchase_order_id: Optional[UUID] = None  # Link to PO if applicable


class BatchScanItem(BaseModel):
    """Individual item in batch scan"""
    barcode: str
    quantity: int = 1


class BatchScanRequest(BaseModel):
    """Batch receive/scan multiple items"""
    items: List[BatchScanItem]
    location_id: UUID
    scan_type: str = "receive"  # "receive", "count", "transfer"


class InventoryScanResult(BaseModel):
    """Result for inventory scanning mode"""
    item_id: UUID
    item_name: str
    item_code: str
    barcode: Optional[str]
    scanned_quantity: int
    system_quantity: int
    par_level: Optional[int]
    reorder_level: Optional[int]
    status: str  # "ok", "low", "critical", "over"
    variance: int


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
        RFIDTag.status == TagStatus.IN_STOCK
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
        # Try to find item by item_code (barcode)
        item = db.query(Item).filter(Item.item_code == scan_data.tag_id).first()
        
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
        if existing_tag.status == TagStatus.IN_STOCK:
            raise HTTPException(
                status_code=400,
                detail=f"Tag already assigned to item: {existing_tag.item_id}"
            )
        else:
            # Reactivate retired tag
            existing_tag.status = TagStatus.IN_STOCK
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
            status=TagStatus.IN_STOCK,
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
        user_id=current_user.id
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
        RFIDTag.status == TagStatus.IN_STOCK
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
        user_id=current_user.id
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


@router.post("/receive-stock")
async def receive_stock_by_scan(
    receive_data: ReceiveStockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Receive stock into Supply Station by scanning barcode/RFID
    This is the primary workflow for receiving vendor shipments.
    
    Workflow:
    1. Scan item barcode
    2. System looks up item by barcode, SKU, or RFID tag
    3. Adds quantity to Supply Station inventory
    4. Creates receipt movement record
    5. Optionally links to Purchase Order
    """
    # Find item by barcode, SKU, or RFID tag
    item = db.query(Item).filter(
        (Item.barcode == receive_data.barcode) |
        (Item.sku == receive_data.barcode) |
        (Item.rfid_tag == receive_data.barcode)
    ).first()
    
    if not item:
        # Try to find by RFID tag record
        rfid_tag = db.query(RFIDTag).filter(
            RFIDTag.tag_id == receive_data.barcode
        ).first()
        if rfid_tag:
            item = db.query(Item).filter(Item.id == rfid_tag.item_id).first()
    
    if not item:
        return {
            "success": False,
            "message": f"Item not found with barcode/SKU: {receive_data.barcode}",
            "item": None,
            "suggested_action": "create_item"
        }
    
    # Default to Supply Station if no location provided
    if receive_data.location_id:
        location = db.query(Location).filter(Location.id == receive_data.location_id).first()
    else:
        location = db.query(Location).filter(Location.name == "Supply Station").first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Update or create inventory record
    inventory = db.query(InventoryCurrent).filter(
        InventoryCurrent.item_id == item.id,
        InventoryCurrent.location_id == location.id
    ).first()
    
    if inventory:
        inventory.quantity_on_hand += receive_data.quantity
    else:
        inventory = InventoryCurrent(
            item_id=item.id,
            location_id=location.id,
            quantity_on_hand=receive_data.quantity,
            quantity_allocated=0
        )
        db.add(inventory)
    
    # Create receipt movement record
    movement = InventoryMovement(
        item_id=item.id,
        to_location_id=location.id,
        quantity=receive_data.quantity,
        movement_type=MovementType.RECEIPT,
        reference_number=receive_data.barcode,
        notes=f"Received via scan. Lot: {receive_data.lot_number or 'N/A'}",
        user_id=current_user.id
    )
    db.add(movement)
    
    # If linked to PO, update PO item
    if receive_data.purchase_order_id:
        from app.models.order import PurchaseOrderItem
        po_item = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.po_id == receive_data.purchase_order_id,
            PurchaseOrderItem.item_id == item.id
        ).first()
        if po_item:
            po_item.quantity_received += receive_data.quantity
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="inventory_receipt",
        entity_id=item.id,
        description=f"Received {receive_data.quantity} x {item.name} into {location.name}",
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Received {receive_data.quantity} x {item.name}",
        "item": {
            "id": str(item.id),
            "name": item.name,
            "item_code": item.item_code,
            "unit_of_measure": item.unit_of_measure,
            "quantity_received": receive_data.quantity,
            "new_quantity_on_hand": inventory.quantity_on_hand
        },
        "location": location.name,
        "movement_id": str(movement.id)
    }


@router.post("/batch-receive")
async def batch_receive_stock(
    batch_data: BatchScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Batch receive multiple items via scanning.
    Useful for receiving shipments where multiple items are scanned sequentially.
    """
    location = db.query(Location).filter(Location.id == batch_data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    results = []
    success_count = 0
    error_count = 0
    
    for scan_item in batch_data.items:
        # Find item
        item = db.query(Item).filter(
            (Item.barcode == scan_item.barcode) |
            (Item.sku == scan_item.barcode) |
            (Item.rfid_tag == scan_item.barcode)
        ).first()
        
        if not item:
            results.append({
                "barcode": scan_item.barcode,
                "success": False,
                "message": "Item not found"
            })
            error_count += 1
            continue
        
        # Update inventory
        inventory = db.query(InventoryCurrent).filter(
            InventoryCurrent.item_id == item.id,
            InventoryCurrent.location_id == batch_data.location_id
        ).first()
        
        if inventory:
            inventory.quantity_on_hand += scan_item.quantity
        else:
            inventory = InventoryCurrent(
                item_id=item.id,
                location_id=batch_data.location_id,
                quantity_on_hand=scan_item.quantity,
                quantity_allocated=0
            )
            db.add(inventory)
        
        # Create movement
        movement = InventoryMovement(
            item_id=item.id,
            to_location_id=batch_data.location_id,
            quantity=scan_item.quantity,
            movement_type=MovementType.RECEIPT,
            reference_number=scan_item.barcode,
            notes=f"Batch receive",
            user_id=current_user.id
        )
        db.add(movement)
        
        results.append({
            "barcode": scan_item.barcode,
            "success": True,
            "item_name": item.name,
            "quantity": scan_item.quantity,
            "new_total": inventory.quantity_on_hand
        })
        success_count += 1
    
    db.commit()
    
    return {
        "success": error_count == 0,
        "message": f"Processed {len(batch_data.items)} items: {success_count} success, {error_count} errors",
        "results": results,
        "location": location.name
    }


@router.post("/inventory-count")
async def scan_for_inventory_count(
    location_id: UUID,
    scanned_items: dict,  # {barcode: quantity}
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare scanned inventory against system records.
    Returns variance report for each item.
    
    scanned_items format: {"barcode1": 5, "barcode2": 10, ...}
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    results = []
    
    # Get all inventory at this location
    location_inventory = db.query(InventoryCurrent).filter(
        InventoryCurrent.location_id == location_id
    ).all()
    
    # Build lookup of items
    item_ids = [inv.item_id for inv in location_inventory]
    items = db.query(Item).filter(Item.id.in_(item_ids)).all()
    item_map = {str(item.id): item for item in items}
    barcode_to_item = {}
    for item in items:
        if item.barcode:
            barcode_to_item[item.barcode] = item
        if item.sku:
            barcode_to_item[item.sku] = item
        if item.rfid_tag:
            barcode_to_item[item.rfid_tag] = item
    
    # Process scanned items
    scanned_item_ids = set()
    for barcode, scanned_qty in scanned_items.items():
        item = barcode_to_item.get(barcode)
        if not item:
            results.append({
                "barcode": barcode,
                "item_name": "Unknown",
                "scanned_quantity": scanned_qty,
                "system_quantity": 0,
                "variance": scanned_qty,
                "status": "not_found"
            })
            continue
        
        scanned_item_ids.add(str(item.id))
        
        # Find system quantity
        inv = next((i for i in location_inventory if i.item_id == item.id), None)
        system_qty = inv.quantity_on_hand if inv else 0
        
        # Get par levels
        from app.models.inventory import ParLevel
        par = db.query(ParLevel).filter(
            ParLevel.item_id == item.id,
            ParLevel.location_id == location_id
        ).first()
        
        variance = scanned_qty - system_qty
        
        # Determine status
        if par and par.par_level:
            if scanned_qty <= (par.reorder_level or 0):
                status = "critical"
            elif scanned_qty < par.par_level:
                status = "low"
            elif scanned_qty > par.par_level * 1.5:
                status = "over"
            else:
                status = "ok"
        else:
            status = "ok" if variance == 0 else ("over" if variance > 0 else "under")
        
        results.append({
            "item_id": str(item.id),
            "item_name": item.name,
            "item_code": item.item_code,
            "barcode": barcode,
            "scanned_quantity": scanned_qty,
            "system_quantity": system_qty,
            "par_level": par.par_level if par else None,
            "reorder_level": par.reorder_level if par else None,
            "variance": variance,
            "status": status
        })
    
    # Find items in system but not scanned
    for inv in location_inventory:
        if str(inv.item_id) not in scanned_item_ids and inv.quantity_on_hand > 0:
            item = item_map.get(str(inv.item_id))
            if item:
                results.append({
                    "item_id": str(inv.item_id),
                    "item_name": item.name if item else "Unknown",
                    "item_code": item.item_code if item else "N/A",
                    "barcode": item.barcode or item.sku,
                    "scanned_quantity": 0,
                    "system_quantity": inv.quantity_on_hand,
                    "variance": -inv.quantity_on_hand,
                    "status": "missing"
                })
    
    # Sort by status priority
    status_order = {"critical": 0, "missing": 1, "low": 2, "under": 3, "over": 4, "ok": 5, "not_found": 6}
    results.sort(key=lambda x: status_order.get(x["status"], 99))
    
    return {
        "location": location.name,
        "total_items_scanned": len(scanned_items),
        "total_items_in_system": len(location_inventory),
        "items_with_variance": len([r for r in results if r["variance"] != 0]),
        "results": results
    }


@router.post("/adjust-inventory")
async def adjust_inventory_after_count(
    location_id: UUID,
    adjustments: List[dict],  # [{item_id, new_quantity}]
    reason: str = "Inventory count adjustment",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adjust inventory quantities after a physical count.
    Creates adjustment movement records for audit trail.
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    adjusted_items = []
    
    for adj in adjustments:
        item_id = UUID(adj["item_id"])
        new_qty = adj["new_quantity"]
        
        inventory = db.query(InventoryCurrent).filter(
            InventoryCurrent.item_id == item_id,
            InventoryCurrent.location_id == location_id
        ).first()
        
        old_qty = inventory.quantity_on_hand if inventory else 0
        variance = new_qty - old_qty
        
        if variance == 0:
            continue
        
        # Update or create inventory
        if inventory:
            inventory.quantity_on_hand = new_qty
        else:
            inventory = InventoryCurrent(
                item_id=item_id,
                location_id=location_id,
                quantity_on_hand=new_qty,
                quantity_allocated=0
            )
            db.add(inventory)
        
        # Create adjustment movement
        movement = InventoryMovement(
            item_id=item_id,
            from_location_id=location_id if variance < 0 else None,
            to_location_id=location_id if variance > 0 else None,
            quantity=abs(variance),
            movement_type=MovementType.ADJUSTMENT,
            notes=f"{reason}. Old: {old_qty}, New: {new_qty}",
            user_id=current_user.id
        )
        db.add(movement)
        
        item = db.query(Item).filter(Item.id == item_id).first()
        adjusted_items.append({
            "item_name": item.name if item else "Unknown",
            "old_quantity": old_qty,
            "new_quantity": new_qty,
            "variance": variance
        })
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="inventory_adjustment",
        entity_id=location_id,
        description=f"Inventory adjustment at {location.name}: {len(adjusted_items)} items adjusted",
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Adjusted {len(adjusted_items)} items at {location.name}",
        "adjustments": adjusted_items
    }

