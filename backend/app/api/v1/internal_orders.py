"""
Internal Orders API Routes
Manages internal restock orders for logistics operations
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.internal_order import InternalOrder, InternalOrderItem, InternalOrderStatus
from app.models.item import Item
from app.models.location import Location

router = APIRouter()


# Pydantic schemas
class InternalOrderResponse(BaseModel):
    id: str
    order_number: str
    status: str
    order_date: datetime
    completed_date: Optional[datetime]
    total_items: int
    total_quantity: int
    created_by_name: Optional[str]
    location_summary: str  # "Station 1, Station 2, ..."
    notes: Optional[str]
    
    class Config:
        from_attributes = True


class InternalOrderDetailResponse(BaseModel):
    id: str
    order_number: str
    status: str
    order_date: datetime
    completed_date: Optional[datetime]
    created_by_name: Optional[str]
    notes: Optional[str]
    items: List[dict]  # Detailed item list with locations
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[InternalOrderResponse])
async def list_internal_orders(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all internal restock orders"""
    query = db.query(InternalOrder)
    
    if status:
        try:
            status_enum = InternalOrderStatus(status.lower())
            query = query.filter(InternalOrder.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter
    
    orders = query.order_by(desc(InternalOrder.order_date)).offset(skip).limit(limit).all()
    
    response = []
    for order in orders:
        # Get total items and quantity
        items = db.query(InternalOrderItem).filter(InternalOrderItem.order_id == order.id).all()
        total_items = len(set(item.item_id for item in items))
        total_quantity = sum(item.quantity_needed for item in items)
        
        # Get unique locations
        location_ids = set(item.location_id for item in items)
        locations = db.query(Location).filter(Location.id.in_(location_ids)).all()
        location_summary = ", ".join(sorted([loc.name for loc in locations]))
        
        # Get creator name
        creator = db.query(User).filter(User.id == order.created_by).first() if order.created_by else None
        created_by_name = f"{creator.first_name} {creator.last_name}" if creator else None
        
        response.append(InternalOrderResponse(
            id=str(order.id),
            order_number=order.order_number,
            status=order.status.value,
            order_date=order.order_date,
            completed_date=order.completed_date,
            total_items=total_items,
            total_quantity=total_quantity,
            created_by_name=created_by_name,
            location_summary=location_summary,
            notes=order.notes
        ))
    
    return response


@router.get("/{order_id}", response_model=InternalOrderDetailResponse)
async def get_internal_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about an internal order"""
    order = db.query(InternalOrder).filter(InternalOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get all items with details
    order_items = db.query(InternalOrderItem).filter(InternalOrderItem.order_id == order_id).all()
    
    # Group by item
    items_grouped = {}
    for oi in order_items:
        item = db.query(Item).filter(Item.id == oi.item_id).first()
        location = db.query(Location).filter(Location.id == oi.location_id).first()
        
        if str(oi.item_id) not in items_grouped:
            items_grouped[str(oi.item_id)] = {
                'item_id': str(oi.item_id),
                'item_name': item.name if item else 'Unknown',
                'item_code': item.item_code if item else 'Unknown',
                'total_quantity': 0,
                'locations': []
            }
        
        items_grouped[str(oi.item_id)]['total_quantity'] += oi.quantity_needed
        items_grouped[str(oi.item_id)]['locations'].append({
            'location_id': str(oi.location_id),
            'location_name': location.name if location else 'Unknown',
            'quantity_needed': oi.quantity_needed,
            'quantity_delivered': oi.quantity_delivered,
            'current_stock': oi.current_stock,
            'par_level': oi.par_level
        })
    
    # Get creator name
    creator = db.query(User).filter(User.id == order.created_by).first() if order.created_by else None
    created_by_name = f"{creator.first_name} {creator.last_name}" if creator else None
    
    return InternalOrderDetailResponse(
        id=str(order.id),
        order_number=order.order_number,
        status=order.status.value,
        order_date=order.order_date,
        completed_date=order.completed_date,
        created_by_name=created_by_name,
        notes=order.notes,
        items=list(items_grouped.values())
    )


@router.patch("/bulk-status")
async def bulk_update_order_status(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the status of multiple internal orders at once"""
    order_ids = request.get("order_ids", [])
    status = request.get("status", "")
    
    if not order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    
    if not status:
        raise HTTPException(status_code=400, detail="No status provided")
    
    try:
        new_status = InternalOrderStatus(status.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    # Convert string IDs to UUIDs
    try:
        uuid_list = [UUID(order_id) for order_id in order_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID format")
    
    # Get all orders
    orders = db.query(InternalOrder).filter(InternalOrder.id.in_(uuid_list)).all()
    
    if not orders:
        raise HTTPException(status_code=404, detail="No orders found")
    
    updated_count = 0
    for order in orders:
        order.status = new_status
        if new_status == InternalOrderStatus.COMPLETED:
            order.completed_date = datetime.utcnow()
        updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Updated {updated_count} order(s) to {new_status.value}",
        "updated_count": updated_count
    }


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: UUID,
    status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the status of an internal order"""
    order = db.query(InternalOrder).filter(InternalOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        new_status = InternalOrderStatus(status.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    order.status = new_status
    if new_status == InternalOrderStatus.COMPLETED:
        order.completed_date = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"Order status updated to {new_status.value}"}


@router.delete("/{order_id}")
async def delete_internal_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an internal order"""
    order = db.query(InternalOrder).filter(InternalOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.delete(order)
    db.commit()
    
    return {"message": "Order deleted successfully"}
