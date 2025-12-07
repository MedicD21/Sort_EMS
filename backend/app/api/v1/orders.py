"""
Purchase Orders API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel as PydanticBase, Field, validator
from uuid import UUID

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.order import PurchaseOrder, PurchaseOrderItem, OrderStatus, Vendor, ShippingCarrier
from app.models.item import Item
from app.models.inventory import InventoryCurrent
from app.models.rfid import InventoryMovement, MovementType
from app.models.audit import AuditLog, AuditAction

router = APIRouter()

# Carrier display names
CARRIER_DISPLAY_NAMES = {
    "ups": "UPS",
    "fedex": "FedEx",
    "usps": "USPS",
    "dhl": "DHL",
    "amazon": "Amazon",
    "ontrac": "OnTrac",
    "other": "Other"
}


# Pydantic schemas
class VendorBase(PydanticBase):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class VendorResponse(VendorBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OrderItemCreate(PydanticBase):
    item_id: UUID
    quantity_ordered: int = Field(gt=0)
    unit_cost: Optional[float] = None


class OrderItemResponse(PydanticBase):
    id: UUID
    item_id: UUID
    item_name: Optional[str] = None
    quantity_ordered: int
    quantity_received: int
    unit_cost: Optional[float] = None
    total_cost: Optional[float] = None
    
    class Config:
        from_attributes = True


class PurchaseOrderCreate(PydanticBase):
    vendor_id: UUID
    po_number: str
    expected_delivery_date: Optional[datetime] = None
    items: List[OrderItemCreate]


class PurchaseOrderUpdate(PydanticBase):
    status: Optional[OrderStatus] = None
    expected_delivery_date: Optional[datetime] = None
    received_date: Optional[datetime] = None


class TrackingUpdate(PydanticBase):
    """Schema for updating tracking information"""
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None  # ups, fedex, usps, dhl, amazon, ontrac, other
    carrier_other: Optional[str] = None  # Name if carrier is "other"
    shipped_date: Optional[datetime] = None
    tracking_url: Optional[str] = None  # Custom tracking URL
    shipping_notes: Optional[str] = None


class ReceiveOrderItem(PydanticBase):
    item_id: UUID
    quantity_received: int = Field(gt=0)
    location_id: UUID


class ReceiveOrderRequest(PydanticBase):
    items: List[ReceiveOrderItem]


class TrackingInfo(PydanticBase):
    """Tracking information response"""
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    carrier_other: Optional[str] = None
    carrier_display: Optional[str] = None  # Friendly name
    shipped_date: Optional[datetime] = None
    tracking_url: Optional[str] = None
    tracking_link: Optional[str] = None  # Auto-generated link
    shipping_notes: Optional[str] = None


class PurchaseOrderResponse(PydanticBase):
    id: UUID
    po_number: str
    vendor_id: UUID
    vendor_name: Optional[str] = None
    status: OrderStatus
    order_date: datetime
    expected_delivery_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    total_cost: Optional[float] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    # Tracking fields
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    carrier_other: Optional[str] = None
    shipped_date: Optional[datetime] = None
    tracking_url: Optional[str] = None
    tracking_link: Optional[str] = None
    shipping_notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# Endpoints
@router.get("/vendors", response_model=List[VendorResponse])
async def list_vendors(
    active_only: bool = Query(True, description="Show only active vendors"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all vendors"""
    query = db.query(Vendor)
    if active_only:
        query = query.filter(Vendor.is_active == True)
    
    vendors = query.order_by(Vendor.name).all()
    return vendors


@router.post("/vendors", response_model=VendorResponse)
async def create_vendor(
    vendor_data: VendorBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new vendor"""
    # Check if vendor name already exists
    existing = db.query(Vendor).filter(Vendor.name == vendor_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor with this name already exists")
    
    vendor = Vendor(**vendor_data.dict())
    db.add(vendor)
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="vendor",
        entity_id=vendor.id,
        changes={"action": "created", "name": vendor.name},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/vendors/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a vendor by ID"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.put("/vendors/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: UUID,
    vendor_data: VendorBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a vendor"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if new name conflicts with another vendor
    if vendor_data.name != vendor.name:
        existing = db.query(Vendor).filter(
            Vendor.name == vendor_data.name,
            Vendor.id != vendor_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Vendor with this name already exists")
    
    # Update fields
    for field, value in vendor_data.dict().items():
        setattr(vendor, field, value)
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="vendor",
        entity_id=vendor.id,
        changes={"action": "updated", "name": vendor.name},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/vendors/{vendor_id}")
async def delete_vendor(
    vendor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a vendor (soft delete by setting inactive)"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if vendor has any purchase orders
    po_count = db.query(PurchaseOrder).filter(PurchaseOrder.vendor_id == vendor_id).count()
    if po_count > 0:
        # Soft delete - just mark as inactive
        vendor.is_active = False
        action_desc = f"Deactivated vendor: {vendor.name} (has {po_count} purchase orders)"
    else:
        # Hard delete if no purchase orders
        db.delete(vendor)
        action_desc = f"Deleted vendor: {vendor.name}"
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="vendor",
        entity_id=vendor.id,
        changes={"action": action_desc},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    return {"message": action_desc}


@router.get("/", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    status: Optional[OrderStatus] = Query(None, description="Filter by status"),
    vendor_id: Optional[UUID] = Query(None, description="Filter by vendor"),
    from_date: Optional[date] = Query(None, description="Orders from this date"),
    to_date: Optional[date] = Query(None, description="Orders to this date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all purchase orders with optional filters"""
    query = db.query(PurchaseOrder)
    
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)
    if from_date:
        query = query.filter(PurchaseOrder.order_date >= from_date)
    if to_date:
        query = query.filter(PurchaseOrder.order_date <= to_date)
    
    orders = query.order_by(desc(PurchaseOrder.order_date)).offset(skip).limit(limit).all()
    
    # Enrich with vendor names and item details
    result = []
    for order in orders:
        carrier_value = order.carrier.value if order.carrier else None
        order_dict = {
            "id": order.id,
            "po_number": order.po_number,
            "vendor_id": order.vendor_id,
            "vendor_name": order.vendor.name if order.vendor else None,
            "status": order.status,
            "order_date": order.order_date,
            "expected_delivery_date": order.expected_delivery_date,
            "received_date": order.received_date,
            "total_cost": float(order.total_cost) if order.total_cost else None,
            "created_at": order.created_at,
            # Tracking info
            "tracking_number": order.tracking_number,
            "carrier": carrier_value,
            "carrier_other": order.carrier_other,
            "shipped_date": order.shipped_date,
            "tracking_url": order.tracking_url,
            "tracking_link": order.tracking_link,
            "shipping_notes": order.shipping_notes,
            "items": []
        }
        
        for po_item in order.items:
            item_dict = {
                "id": po_item.id,
                "item_id": po_item.item_id,
                "item_name": po_item.item.name if po_item.item else None,
                "quantity_ordered": po_item.quantity_ordered,
                "quantity_received": po_item.quantity_received,
                "unit_cost": float(po_item.unit_cost) if po_item.unit_cost else None,
                "total_cost": float(po_item.total_cost) if po_item.total_cost else None
            }
            order_dict["items"].append(item_dict)
        
        result.append(order_dict)
    
    return result


@router.get("/{order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific purchase order by ID"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    carrier_value = order.carrier.value if order.carrier else None
    order_dict = {
        "id": order.id,
        "po_number": order.po_number,
        "vendor_id": order.vendor_id,
        "vendor_name": order.vendor.name if order.vendor else None,
        "status": order.status,
        "order_date": order.order_date,
        "expected_delivery_date": order.expected_delivery_date,
        "received_date": order.received_date,
        "total_cost": float(order.total_cost) if order.total_cost else None,
        "created_at": order.created_at,
        # Tracking info
        "tracking_number": order.tracking_number,
        "carrier": carrier_value,
        "carrier_other": order.carrier_other,
        "shipped_date": order.shipped_date,
        "tracking_url": order.tracking_url,
        "tracking_link": order.tracking_link,
        "shipping_notes": order.shipping_notes,
        "items": []
    }
    
    for po_item in order.items:
        item_dict = {
            "id": po_item.id,
            "item_id": po_item.item_id,
            "item_name": po_item.item.name if po_item.item else None,
            "quantity_ordered": po_item.quantity_ordered,
            "quantity_received": po_item.quantity_received,
            "unit_cost": float(po_item.unit_cost) if po_item.unit_cost else None,
            "total_cost": float(po_item.total_cost) if po_item.total_cost else None
        }
        order_dict["items"].append(item_dict)
    
    return order_dict


@router.post("/", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    order_data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new purchase order"""
    # Verify vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == order_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if PO number already exists
    existing_po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == order_data.po_number).first()
    if existing_po:
        raise HTTPException(status_code=400, detail="PO number already exists")
    
    # Verify all items exist
    item_ids = [item.item_id for item in order_data.items]
    items = db.query(Item).filter(Item.id.in_(item_ids)).all()
    if len(items) != len(item_ids):
        raise HTTPException(status_code=404, detail="One or more items not found")
    
    # Create purchase order
    purchase_order = PurchaseOrder(
        po_number=order_data.po_number,
        vendor_id=order_data.vendor_id,
        status=OrderStatus.PENDING,
        order_date=datetime.utcnow(),
        expected_delivery_date=order_data.expected_delivery_date,
        created_by=current_user.id
    )
    db.add(purchase_order)
    db.flush()  # Get the PO ID
    
    # Create order items and calculate total
    total_cost = 0
    for item_data in order_data.items:
        item_total = None
        if item_data.unit_cost:
            item_total = item_data.unit_cost * item_data.quantity_ordered
            total_cost += item_total
        
        po_item = PurchaseOrderItem(
            po_id=purchase_order.id,
            item_id=item_data.item_id,
            quantity_ordered=item_data.quantity_ordered,
            unit_cost=item_data.unit_cost,
            total_cost=item_total
        )
        db.add(po_item)
    
    purchase_order.total_cost = total_cost if total_cost > 0 else None
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        changes={"po_number": order_data.po_number, "vendor": vendor.name},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(purchase_order)
    
    # Return formatted response
    return await get_purchase_order(purchase_order.id, db, current_user)


@router.put("/{order_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    order_id: UUID,
    order_update: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a purchase order"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Update fields
    update_data = order_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="purchase_order",
        entity_id=order.id,
        changes={"po_number": order.po_number, "updates": update_data},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(order)
    
    return await get_purchase_order(order.id, db, current_user)


@router.put("/{order_id}/tracking", response_model=PurchaseOrderResponse)
async def update_order_tracking(
    order_id: UUID,
    tracking_data: TrackingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update tracking information for a purchase order"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot update tracking for cancelled order")
    
    # Update tracking fields
    if tracking_data.tracking_number is not None:
        order.tracking_number = tracking_data.tracking_number
    
    if tracking_data.carrier is not None:
        try:
            order.carrier = ShippingCarrier(tracking_data.carrier)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid carrier. Must be one of: ups, fedex, usps, dhl, amazon, ontrac, other"
            )
    
    if tracking_data.carrier_other is not None:
        order.carrier_other = tracking_data.carrier_other
    
    if tracking_data.shipped_date is not None:
        order.shipped_date = tracking_data.shipped_date
    
    if tracking_data.tracking_url is not None:
        order.tracking_url = tracking_data.tracking_url
    
    if tracking_data.shipping_notes is not None:
        order.shipping_notes = tracking_data.shipping_notes
    
    # Auto-update status to "shipped" if tracking is added and order is "ordered"
    if order.tracking_number and order.status == OrderStatus.ORDERED:
        order.status = OrderStatus.SHIPPED
        if not order.shipped_date:
            order.shipped_date = datetime.utcnow()
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="purchase_order",
        entity_id=order.id,
        changes={
            "tracking_number": tracking_data.tracking_number,
            "carrier": tracking_data.carrier,
            "action": "tracking_updated"
        },
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(order)
    
    return await get_purchase_order(order.id, db, current_user)


@router.get("/{order_id}/tracking", response_model=TrackingInfo)
async def get_order_tracking(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tracking information for a purchase order"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    carrier_value = order.carrier.value if order.carrier else None
    carrier_display = CARRIER_DISPLAY_NAMES.get(carrier_value, None) if carrier_value else None
    if carrier_value == "other" and order.carrier_other:
        carrier_display = order.carrier_other
    
    return TrackingInfo(
        tracking_number=order.tracking_number,
        carrier=carrier_value,
        carrier_other=order.carrier_other,
        carrier_display=carrier_display,
        shipped_date=order.shipped_date,
        tracking_url=order.tracking_url,
        tracking_link=order.tracking_link,
        shipping_notes=order.shipping_notes
    )


@router.post("/{order_id}/receive")
async def receive_purchase_order(
    order_id: UUID,
    receive_data: ReceiveOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Receive items from a purchase order and update inventory"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot receive cancelled order")
    
    # Process each received item
    fully_received = True
    for receive_item in receive_data.items:
        # Find the PO item
        po_item = db.query(PurchaseOrderItem).filter(
            and_(
                PurchaseOrderItem.po_id == order_id,
                PurchaseOrderItem.item_id == receive_item.item_id
            )
        ).first()
        
        if not po_item:
            raise HTTPException(
                status_code=404,
                detail=f"Item {receive_item.item_id} not found in this order"
            )
        
        # Validate quantity
        new_total = po_item.quantity_received + receive_item.quantity_received
        if new_total > po_item.quantity_ordered:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot receive more than ordered quantity for item {receive_item.item_id}"
            )
        
        # Update PO item received quantity
        po_item.quantity_received = new_total
        
        # Check if this item is fully received
        if po_item.quantity_received < po_item.quantity_ordered:
            fully_received = False
        
        # Update inventory
        inventory = db.query(InventoryCurrent).filter(
            and_(
                InventoryCurrent.item_id == receive_item.item_id,
                InventoryCurrent.location_id == receive_item.location_id
            )
        ).first()
        
        if inventory:
            inventory.quantity_on_hand += receive_item.quantity_received
            inventory.updated_at = datetime.utcnow()
        else:
            # Create new inventory record
            inventory = InventoryCurrent(
                item_id=receive_item.item_id,
                location_id=receive_item.location_id,
                quantity_on_hand=receive_item.quantity_received
            )
            db.add(inventory)
        
        # Create inventory movement record
        movement = InventoryMovement(
            item_id=receive_item.item_id,
            location_id=receive_item.location_id,
            movement_type=MovementType.RECEIPT,
            quantity=receive_item.quantity_received,
            user_id=current_user.id,
            reference_id=str(order.id),
            notes=f"Received from PO {order.po_number}"
        )
        db.add(movement)
    
    # Update order status
    if fully_received:
        # Check if ALL items in the order are fully received
        all_items_received = all(
            item.quantity_received == item.quantity_ordered
            for item in order.items
        )
        if all_items_received:
            order.status = OrderStatus.RECEIVED
            order.received_date = datetime.utcnow()
        else:
            order.status = OrderStatus.PARTIAL
    else:
        order.status = OrderStatus.PARTIAL
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="purchase_order",
        entity_id=order.id,
        changes={"action": "received_items", "po_number": order.po_number},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    
    return {
        "message": "Items received successfully",
        "order_status": order.status,
        "fully_received": order.status == OrderStatus.RECEIVED
    }


@router.delete("/{order_id}")
async def cancel_purchase_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a purchase order"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status == OrderStatus.RECEIVED:
        raise HTTPException(status_code=400, detail="Cannot cancel a fully received order")
    
    if order.status == OrderStatus.PARTIAL:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel a partially received order. Contact administrator."
        )
    
    order.status = OrderStatus.CANCELLED
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="purchase_order",
        entity_id=order.id,
        changes={"action": "cancelled", "po_number": order.po_number},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    
    return {"message": f"Purchase order {order.po_number} cancelled successfully"}


# =============================================================================
# REORDER SUGGESTIONS
# =============================================================================

class ReorderSuggestion(PydanticBase):
    item_id: UUID
    item_code: str
    item_name: str
    category_name: Optional[str] = None
    current_total_stock: int
    total_par_level: int
    total_reorder_level: int
    shortage: int
    suggested_order_qty: int
    preferred_vendor_id: Optional[UUID] = None
    preferred_vendor_name: Optional[str] = None
    estimated_cost: Optional[float] = None
    locations_below_par: int
    urgency: str  # "critical", "high", "medium", "low"


@router.get("/suggestions/reorder", response_model=List[ReorderSuggestion])
async def get_reorder_suggestions(
    vendor_id: Optional[UUID] = Query(None, description="Filter by preferred vendor"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    urgency: Optional[str] = Query(None, description="Filter by urgency: critical, high, medium, low"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get automated reorder suggestions based on current stock levels vs par levels.
    
    Returns items that are below their reorder point with suggested quantities
    and preferred vendor information.
    """
    from app.models.par_level import ParLevel
    from app.models.item import Category
    
    # Get all active items with their inventory and par levels
    items = db.query(Item).filter(Item.is_active == True)
    
    if category_id:
        items = items.filter(Item.category_id == category_id)
    
    items = items.all()
    
    suggestions = []
    
    for item in items:
        # Get all inventory across locations
        inventories = db.query(InventoryCurrent).filter(
            InventoryCurrent.item_id == item.id
        ).all()
        
        # Get par levels for all locations
        par_levels = db.query(ParLevel).filter(
            ParLevel.item_id == item.id
        ).all()
        
        if not par_levels:
            continue
        
        # Calculate totals
        total_stock = sum(inv.quantity_on_hand - inv.quantity_allocated for inv in inventories)
        total_par = sum(p.par_quantity for p in par_levels)
        total_reorder = sum(p.reorder_quantity for p in par_levels)
        
        # Count locations below par
        locations_below = 0
        for par in par_levels:
            inv = next((i for i in inventories if i.location_id == par.location_id), None)
            if inv:
                available = inv.quantity_on_hand - inv.quantity_allocated
                if available < par.reorder_quantity:
                    locations_below += 1
            else:
                locations_below += 1  # No inventory = below par
        
        # Skip if stock is above reorder level
        if total_stock >= total_reorder:
            continue
        
        shortage = total_par - total_stock
        
        # Calculate suggested order quantity (bring to par level + 10% buffer)
        suggested_qty = int(shortage * 1.1)
        if suggested_qty < 1:
            suggested_qty = 1
        
        # Apply max reorder quantity per station limit if set
        if item.max_reorder_quantity_per_station and locations_below > 0:
            max_total = item.max_reorder_quantity_per_station * locations_below
            suggested_qty = min(suggested_qty, max_total)
        
        # Determine urgency
        stock_ratio = total_stock / total_reorder if total_reorder > 0 else 0
        if stock_ratio <= 0.25:
            item_urgency = "critical"
        elif stock_ratio <= 0.5:
            item_urgency = "high"
        elif stock_ratio <= 0.75:
            item_urgency = "medium"
        else:
            item_urgency = "low"
        
        # Skip if filtering by urgency and doesn't match
        if urgency and item_urgency != urgency:
            continue
        
        # Get preferred vendor from item or auto-order rules
        preferred_vendor = None
        if item.preferred_vendor:
            preferred_vendor = db.query(Vendor).filter(
                Vendor.name == item.preferred_vendor,
                Vendor.is_active == True
            ).first()
        
        # Check auto-order rules
        from app.models.order import AutoOrderRule
        auto_rule = db.query(AutoOrderRule).filter(
            AutoOrderRule.item_id == item.id,
            AutoOrderRule.is_active == True
        ).first()
        
        if auto_rule and auto_rule.preferred_vendor_id:
            preferred_vendor = db.query(Vendor).filter(
                Vendor.id == auto_rule.preferred_vendor_id,
                Vendor.is_active == True
            ).first()
            if auto_rule.order_quantity:
                suggested_qty = max(suggested_qty, auto_rule.order_quantity)
        
        # Skip if filtering by vendor and doesn't match
        if vendor_id:
            if not preferred_vendor or preferred_vendor.id != vendor_id:
                continue
        
        # Get category name
        category = db.query(Category).filter(Category.id == item.category_id).first()
        
        # Calculate estimated cost
        estimated_cost = None
        if item.cost_per_unit:
            estimated_cost = round(suggested_qty * float(item.cost_per_unit), 2)
        
        suggestions.append(ReorderSuggestion(
            item_id=item.id,
            item_code=item.item_code,
            item_name=item.name,
            category_name=category.name if category else None,
            current_total_stock=total_stock,
            total_par_level=total_par,
            total_reorder_level=total_reorder,
            shortage=shortage,
            suggested_order_qty=suggested_qty,
            preferred_vendor_id=preferred_vendor.id if preferred_vendor else None,
            preferred_vendor_name=preferred_vendor.name if preferred_vendor else None,
            estimated_cost=estimated_cost,
            locations_below_par=locations_below,
            urgency=item_urgency
        ))
    
    # Sort by urgency (critical first) then by shortage
    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    suggestions.sort(key=lambda x: (urgency_order.get(x.urgency, 4), -x.shortage))
    
    return suggestions


@router.post("/suggestions/create-po")
async def create_po_from_suggestions(
    item_ids: List[UUID],
    vendor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a purchase order from selected reorder suggestions.
    
    Takes a list of item IDs and creates a PO with the suggested quantities.
    """
    # Verify vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.is_active == True).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get suggestions for selected items
    suggestions = await get_reorder_suggestions(
        vendor_id=None, category_id=None, urgency=None, db=db, current_user=current_user
    )
    
    selected_suggestions = [s for s in suggestions if s.item_id in item_ids]
    
    if not selected_suggestions:
        raise HTTPException(status_code=400, detail="No valid items found for reorder")
    
    # Generate PO number
    from datetime import datetime
    date_str = datetime.utcnow().strftime("%Y%m%d")
    random_suffix = str(hash(str(item_ids) + str(datetime.utcnow())))[-4:]
    po_number = f"PO-{date_str}-{random_suffix}"
    
    # Check for duplicate PO number
    existing = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_number).first()
    if existing:
        po_number = f"PO-{date_str}-{random_suffix}A"
    
    # Create purchase order
    purchase_order = PurchaseOrder(
        po_number=po_number,
        vendor_id=vendor_id,
        status=OrderStatus.PENDING,
        order_date=datetime.utcnow(),
        created_by=current_user.id
    )
    db.add(purchase_order)
    db.flush()
    
    # Create order items
    total_cost = 0
    for suggestion in selected_suggestions:
        item = db.query(Item).filter(Item.id == suggestion.item_id).first()
        
        unit_cost = float(item.cost_per_unit) if item.cost_per_unit else None
        item_total = None
        if unit_cost:
            item_total = unit_cost * suggestion.suggested_order_qty
            total_cost += item_total
        
        po_item = PurchaseOrderItem(
            po_id=purchase_order.id,
            item_id=suggestion.item_id,
            quantity_ordered=suggestion.suggested_order_qty,
            unit_cost=unit_cost,
            total_cost=item_total
        )
        db.add(po_item)
    
    purchase_order.total_cost = total_cost if total_cost > 0 else None
    
    # Create audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        changes={"po_number": po_number, "source": "reorder_suggestions", "items_count": len(selected_suggestions)},
        ip_address="127.0.0.1"
    )
    db.add(audit_log)
    
    db.commit()
    
    return {
        "message": f"Purchase order {po_number} created successfully",
        "po_id": str(purchase_order.id),
        "po_number": po_number,
        "items_count": len(selected_suggestions),
        "total_cost": total_cost
    }
