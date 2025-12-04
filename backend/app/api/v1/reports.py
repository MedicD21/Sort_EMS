"""
Reports API endpoints for analytics and reporting
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from app.core.database import get_db
from app.models.user import User
from app.models.item import Item, Category
from app.models.location import Location
from app.models.inventory import InventoryCurrent
from app.models.rfid import InventoryMovement
from app.models.par_level import ParLevel
from app.models.audit import AuditLog
from app.models.order import PurchaseOrder, PurchaseOrderItem
from app.api.v1.auth import get_current_user
from pydantic import BaseModel


router = APIRouter()


# Response Models
class LowStockItem(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    location_id: UUID
    location_name: str
    current_quantity: int
    par_quantity: int
    reorder_quantity: int
    shortage: int
    category: str


class ExpiringItem(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    location_id: UUID
    location_name: str
    expiration_date: datetime
    days_until_expiration: int
    quantity: int


class UsageStatistic(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    category: str
    total_used: int
    total_received: int
    net_change: int
    average_daily_usage: float
    period_days: int


class InventorySummary(BaseModel):
    total_items: int
    total_locations: int
    items_below_par: int
    items_at_or_above_par: int
    total_value: float
    categories: List[dict]


class AuditReportEntry(BaseModel):
    id: UUID
    timestamp: datetime
    user_name: str
    action: str
    entity_type: str
    entity_id: Optional[UUID]
    description: str
    ip_address: Optional[str]


@router.get("/low-stock", response_model=List[LowStockItem])
async def get_low_stock_report(
    location_id: Optional[UUID] = Query(None, description="Filter by location"),
    category_id: Optional[UUID] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get report of items below their reorder point
    """
    # Query for items below reorder quantity
    query = db.query(
        Item,
        Location,
        InventoryCurrent,
        ParLevel,
        Category
    ).join(
        InventoryCurrent, Item.id == InventoryCurrent.item_id
    ).join(
        Location, InventoryCurrent.location_id == Location.id
    ).join(
        ParLevel, and_(
            ParLevel.item_id == Item.id,
            ParLevel.location_id == Location.id
        )
    ).join(
        Category, Item.category_id == Category.id
    ).filter(
        Item.is_active == True,
        Location.is_active == True
    )
    
    # Apply filters
    if location_id:
        query = query.filter(Location.id == location_id)
    if category_id:
        query = query.filter(Category.id == category_id)
    
    results = query.all()
    
    low_stock_items = []
    for item, location, inventory, par_level, category in results:
        available = inventory.quantity_on_hand - inventory.quantity_allocated
        
        # Check if below reorder point
        if available < par_level.reorder_quantity:
            low_stock_items.append(LowStockItem(
                item_id=item.id,
                item_code=item.item_code,
                item_name=item.name,
                location_id=location.id,
                location_name=location.name,
                current_quantity=available,
                par_quantity=par_level.par_quantity,
                reorder_quantity=par_level.reorder_quantity,
                shortage=par_level.par_quantity - available,
                category=category.name
            ))
    
    # Sort by shortage (most critical first)
    low_stock_items.sort(key=lambda x: x.shortage, reverse=True)
    
    return low_stock_items


@router.get("/usage", response_model=List[UsageStatistic])
async def get_usage_statistics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    category_id: Optional[UUID] = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=500, description="Maximum items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get usage statistics for items over a specified period
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all items
    items_query = db.query(Item).join(Category).filter(Item.is_active == True)
    
    if category_id:
        items_query = items_query.filter(Item.category_id == category_id)
    
    items = items_query.all()
    
    usage_stats = []
    
    for item in items:
        # Get movements for this item in the period
        movements = db.query(InventoryMovement).filter(
            InventoryMovement.item_id == item.id,
            InventoryMovement.created_at >= start_date
        ).all()
        
        total_used = 0
        total_received = 0
        
        for movement in movements:
            if movement.from_location_id and not movement.to_location_id:
                # Item was removed (used/consumed)
                total_used += movement.quantity
            elif movement.to_location_id and not movement.from_location_id:
                # Item was received
                total_received += movement.quantity
        
        # Only include items with activity
        if total_used > 0 or total_received > 0:
            net_change = total_received - total_used
            avg_daily = total_used / days if days > 0 else 0
            
            usage_stats.append(UsageStatistic(
                item_id=item.id,
                item_code=item.item_code,
                item_name=item.name,
                category=item.category.name,
                total_used=total_used,
                total_received=total_received,
                net_change=net_change,
                average_daily_usage=round(avg_daily, 2),
                period_days=days
            ))
    
    # Sort by most used
    usage_stats.sort(key=lambda x: x.total_used, reverse=True)
    
    return usage_stats[:limit]


@router.get("/inventory-summary", response_model=InventorySummary)
async def get_inventory_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overall inventory summary with key metrics
    """
    # Count total items and locations
    total_items = db.query(Item).filter(Item.is_active == True).count()
    total_locations = db.query(Location).filter(Location.is_active == True).count()
    
    # Get par level comparison
    items_below_par = 0
    items_at_or_above = 0
    total_value = 0.0
    
    # Get all inventory with par levels
    inventory_items = db.query(
        Item,
        InventoryCurrent,
        ParLevel
    ).join(
        InventoryCurrent, Item.id == InventoryCurrent.item_id
    ).outerjoin(
        ParLevel, and_(
            ParLevel.item_id == Item.id,
            ParLevel.location_id == InventoryCurrent.location_id
        )
    ).filter(Item.is_active == True).all()
    
    for item, inv, par in inventory_items:
        available = inv.quantity_on_hand - inv.quantity_allocated
        
        if par:
            if available < par.reorder_quantity:
                items_below_par += 1
            else:
                items_at_or_above += 1
        
        # Calculate value if cost is available
        if item.cost_per_unit:
            total_value += available * item.cost_per_unit
    
    # Get category breakdown
    categories_data = []
    categories = db.query(Category).all()
    
    for category in categories:
        item_count = db.query(Item).filter(
            Item.category_id == category.id,
            Item.is_active == True
        ).count()
        
        categories_data.append({
            "id": str(category.id),
            "name": category.name,
            "item_count": item_count
        })
    
    return InventorySummary(
        total_items=total_items,
        total_locations=total_locations,
        items_below_par=items_below_par,
        items_at_or_above_par=items_at_or_above,
        total_value=round(total_value, 2),
        categories=categories_data
    )


@router.get("/audit", response_model=List[AuditReportEntry])
async def get_audit_report(
    start_date: Optional[datetime] = Query(None, description="Filter from date"),
    end_date: Optional[datetime] = Query(None, description="Filter to date"),
    user_id: Optional[UUID] = Query(None, description="Filter by user"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit log report with filtering options
    Requires admin role for full access
    """
    query = db.query(AuditLog).join(User, AuditLog.user_id == User.id)
    
    # Apply filters
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    else:
        # Default to last 30 days
        query = query.filter(AuditLog.timestamp >= datetime.utcnow() - timedelta(days=30))
    
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    
    # Order by most recent first
    query = query.order_by(AuditLog.timestamp.desc())
    
    logs = query.limit(limit).all()
    
    return [
        AuditReportEntry(
            id=log.id,
            timestamp=log.timestamp,
            user_name=log.user.username,
            action=log.action.value if hasattr(log.action, 'value') else str(log.action),
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            description=log.description,
            ip_address=log.ip_address
        )
        for log in logs
    ]


@router.get("/order-history")
async def get_order_history(
    days: int = Query(90, ge=1, le=365, description="Number of days to analyze"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get purchase order history and statistics
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(PurchaseOrder).filter(
        PurchaseOrder.created_at >= start_date
    )
    
    if status:
        query = query.filter(PurchaseOrder.status == status)
    
    orders = query.order_by(PurchaseOrder.created_at.desc()).all()
    
    # Calculate statistics
    total_orders = len(orders)
    total_value = sum(order.total_amount or 0 for order in orders)
    pending_count = sum(1 for order in orders if order.status == "pending")
    received_count = sum(1 for order in orders if order.status == "received")
    
    return {
        "period_days": days,
        "total_orders": total_orders,
        "total_value": round(total_value, 2),
        "pending_orders": pending_count,
        "received_orders": received_count,
        "orders": [
            {
                "id": str(order.id),
                "order_number": order.order_number,
                "vendor_name": order.vendor.name if order.vendor else "Unknown",
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "order_date": order.order_date.isoformat() if order.order_date else None,
                "expected_delivery": order.expected_delivery_date.isoformat() if order.expected_delivery_date else None,
                "total_amount": float(order.total_amount) if order.total_amount else 0,
                "created_at": order.created_at.isoformat()
            }
            for order in orders[:50]  # Limit to 50 most recent
        ]
    }


@router.get("/movement-history")
async def get_movement_history(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    location_id: Optional[UUID] = Query(None, description="Filter by location"),
    item_id: Optional[UUID] = Query(None, description="Filter by item"),
    limit: int = Query(100, ge=1, le=500, description="Maximum records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get inventory movement history with analytics
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(InventoryMovement).filter(
        InventoryMovement.created_at >= start_date
    )
    
    if location_id:
        query = query.filter(
            or_(
                InventoryMovement.from_location_id == location_id,
                InventoryMovement.to_location_id == location_id
            )
        )
    
    if item_id:
        query = query.filter(InventoryMovement.item_id == item_id)
    
    movements = query.order_by(InventoryMovement.created_at.desc()).limit(limit).all()
    
    # Calculate statistics
    total_movements = len(movements)
    total_quantity_moved = sum(mov.quantity for mov in movements)
    
    movement_types = {}
    for mov in movements:
        mov_type = mov.movement_type.value if hasattr(mov.movement_type, 'value') else str(mov.movement_type)
        movement_types[mov_type] = movement_types.get(mov_type, 0) + 1
    
    return {
        "period_days": days,
        "total_movements": total_movements,
        "total_quantity_moved": total_quantity_moved,
        "movement_types": movement_types,
        "movements": [
            {
                "id": str(mov.id),
                "item_id": str(mov.item_id),
                "from_location_id": str(mov.from_location_id) if mov.from_location_id else None,
                "to_location_id": str(mov.to_location_id) if mov.to_location_id else None,
                "quantity": mov.quantity,
                "movement_type": mov.movement_type.value if hasattr(mov.movement_type, 'value') else str(mov.movement_type),
                "notes": mov.notes,
                "created_at": mov.created_at.isoformat(),
                "user": mov.user.username if mov.user else "System"
            }
            for mov in movements
        ]
    }
