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
    changes: Optional[dict]  # JSON changes data
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
    query = db.query(AuditLog).outerjoin(User, AuditLog.user_id == User.id)
    
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
            user_name=log.user.username if log.user else "System",
            action=log.action.value if hasattr(log.action, 'value') else str(log.action),
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            changes=log.changes,
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
    total_value = sum(order.total_cost or 0 for order in orders)
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
                "order_number": order.po_number,
                "vendor_name": order.vendor.name if order.vendor else "Unknown",
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "order_date": order.order_date.isoformat() if order.order_date else None,
                "expected_delivery": order.expected_delivery_date.isoformat() if order.expected_delivery_date else None,
                "total_amount": float(order.total_cost) if order.total_cost else 0,
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


class CostAnalysisItem(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    category: str
    unit_cost: float
    total_quantity: int
    total_value: float
    percentage_of_total: float


class CostByCategory(BaseModel):
    category_id: str
    category_name: str
    total_items: int
    total_quantity: int
    total_value: float
    percentage_of_total: float


class CostAnalysisResponse(BaseModel):
    total_inventory_value: float
    total_items: int
    total_quantity: int
    average_item_cost: float
    highest_value_items: List[CostAnalysisItem]
    lowest_value_items: List[CostAnalysisItem]
    cost_by_category: List[CostByCategory]
    value_distribution: dict


@router.get("/cost-analysis", response_model=CostAnalysisResponse)
async def get_cost_analysis(
    category_id: Optional[str] = Query(None, description="Filter by category"),
    location_id: Optional[UUID] = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive cost analysis of inventory
    """
    # Base query for inventory with item details
    query = db.query(
        Item,
        InventoryCurrent,
        Category
    ).outerjoin(
        InventoryCurrent, Item.id == InventoryCurrent.item_id
    ).outerjoin(
        Category, Item.category_id == Category.id
    ).filter(Item.is_active == True)
    
    if category_id:
        query = query.filter(Item.category_id == category_id)
    
    if location_id:
        query = query.filter(InventoryCurrent.location_id == location_id)
    
    results = query.all()
    
    # Calculate costs per item
    item_costs = []
    total_value = 0
    total_quantity = 0
    
    for item, inventory, category in results:
        unit_cost = float(item.cost_per_unit or 0)
        qty = inventory.quantity_on_hand if inventory else 0
        value = unit_cost * qty
        
        total_value += value
        total_quantity += qty
        
        if qty > 0:  # Only include items with inventory
            item_costs.append({
                "item_id": item.id,
                "item_code": item.item_code or "",
                "item_name": item.name,
                "category": category.name if category else "Uncategorized",
                "category_id": item.category_id or "",
                "unit_cost": unit_cost,
                "total_quantity": qty,
                "total_value": value,
                "percentage_of_total": 0  # Calculate after we have total
            })
    
    # Calculate percentages
    for item in item_costs:
        if total_value > 0:
            item["percentage_of_total"] = round((item["total_value"] / total_value) * 100, 2)
    
    # Sort by value for highest/lowest
    sorted_by_value = sorted(item_costs, key=lambda x: x["total_value"], reverse=True)
    highest_value = sorted_by_value[:10]
    lowest_value = sorted_by_value[-10:] if len(sorted_by_value) > 10 else sorted_by_value
    lowest_value = sorted(lowest_value, key=lambda x: x["total_value"])
    
    # Cost by category
    category_costs = {}
    for item in item_costs:
        cat_id = item["category_id"]
        cat_name = item["category"]
        if cat_id not in category_costs:
            category_costs[cat_id] = {
                "category_id": cat_id,
                "category_name": cat_name,
                "total_items": 0,
                "total_quantity": 0,
                "total_value": 0,
                "percentage_of_total": 0
            }
        category_costs[cat_id]["total_items"] += 1
        category_costs[cat_id]["total_quantity"] += item["total_quantity"]
        category_costs[cat_id]["total_value"] += item["total_value"]
    
    # Calculate category percentages
    for cat in category_costs.values():
        if total_value > 0:
            cat["percentage_of_total"] = round((cat["total_value"] / total_value) * 100, 2)
    
    cost_by_category = sorted(category_costs.values(), key=lambda x: x["total_value"], reverse=True)
    
    # Value distribution buckets
    distribution = {
        "0-50": 0,
        "51-100": 0,
        "101-500": 0,
        "501-1000": 0,
        "1001+": 0
    }
    
    for item in item_costs:
        value = item["total_value"]
        if value <= 50:
            distribution["0-50"] += 1
        elif value <= 100:
            distribution["51-100"] += 1
        elif value <= 500:
            distribution["101-500"] += 1
        elif value <= 1000:
            distribution["501-1000"] += 1
        else:
            distribution["1001+"] += 1
    
    return {
        "total_inventory_value": round(total_value, 2),
        "total_items": len(item_costs),
        "total_quantity": total_quantity,
        "average_item_cost": round(total_value / len(item_costs), 2) if item_costs else 0,
        "highest_value_items": highest_value,
        "lowest_value_items": lowest_value,
        "cost_by_category": cost_by_category,
        "value_distribution": distribution
    }


# ============================================================================
# NEW COMPREHENSIVE REPORTS
# ============================================================================

class ProductLifeProjection(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    category: str
    current_stock: int
    average_daily_usage: float
    projected_days_remaining: int
    projected_reorder_date: Optional[str]
    lead_time_days: int
    recommended_reorder_date: Optional[str]
    status: str  # "Critical", "Low", "Normal", "Overstocked"


class COGItem(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    category: str
    unit_cost: float
    total_used: int
    total_cost_used: float
    period_days: int
    monthly_cost_rate: float
    yearly_projected_cost: float


class COGReport(BaseModel):
    period_days: int
    total_items_used: int
    total_cost_of_goods_used: float
    average_daily_cog: float
    projected_monthly_cog: float
    projected_yearly_cog: float
    by_category: List[dict]
    top_cost_items: List[COGItem]


class UsageHistoryEntry(BaseModel):
    date: str
    total_used: int
    total_received: int
    net_change: int
    movements_count: int


class DetailedUsageReport(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    category: str
    period_days: int
    total_used: int
    total_received: int
    average_daily_usage: float
    peak_usage_day: Optional[str]
    peak_usage_amount: int
    trend: str  # "Increasing", "Decreasing", "Stable"
    daily_history: List[UsageHistoryEntry]


class ExpirationAlert(BaseModel):
    item_id: UUID
    item_code: str
    item_name: str
    location_id: UUID
    location_name: str
    expiration_date: str
    days_until_expiration: int
    quantity: int
    estimated_value: float
    status: str  # "Expired", "Critical", "Warning", "OK"


class ExpirationReport(BaseModel):
    total_expiring_items: int
    total_expired: int
    total_critical: int  # < 7 days
    total_warning: int   # < 30 days
    total_at_risk_value: float
    items: List[ExpirationAlert]


@router.get("/product-life-projection", response_model=List[ProductLifeProjection])
async def get_product_life_projection(
    days_history: int = Query(30, ge=7, le=365, description="Days of history to analyze"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    include_zero_stock: bool = Query(False, description="Include items with zero stock"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get projected product life based on historical usage patterns.
    Calculates when items will need to be reordered based on current stock and usage rates.
    """
    start_date = datetime.utcnow() - timedelta(days=days_history)
    
    # Get all active items
    items_query = db.query(Item).filter(Item.is_active == True)
    if category_id:
        items_query = items_query.filter(Item.category_id == category_id)
    items = items_query.all()
    
    projections = []
    
    for item in items:
        # Get current stock across all locations
        total_stock = 0
        inventory_records = db.query(InventoryCurrent).filter(
            InventoryCurrent.item_id == item.id
        ).all()
        
        for inv in inventory_records:
            total_stock += inv.quantity_on_hand - inv.quantity_allocated
        
        if not include_zero_stock and total_stock <= 0:
            continue
        
        # Get usage history for this item
        movements = db.query(InventoryMovement).filter(
            InventoryMovement.item_id == item.id,
            InventoryMovement.created_at >= start_date
        ).all()
        
        total_used = 0
        for movement in movements:
            if movement.from_location_id and not movement.to_location_id:
                total_used += movement.quantity
        
        # Calculate average daily usage
        avg_daily = total_used / days_history if days_history > 0 else 0
        
        # Calculate projected days remaining
        if avg_daily > 0:
            days_remaining = int(total_stock / avg_daily)
        else:
            days_remaining = 999  # Effectively infinite
        
        # Calculate projected reorder date
        projected_reorder = None
        recommended_reorder = None
        lead_time = int(item.lead_time_days or 0)
        
        if days_remaining < 999:
            projected_reorder = (datetime.utcnow() + timedelta(days=days_remaining)).strftime("%Y-%m-%d")
            # Recommended reorder should account for lead time
            days_to_reorder = max(0, days_remaining - lead_time - 3)  # 3 day buffer
            recommended_reorder = (datetime.utcnow() + timedelta(days=days_to_reorder)).strftime("%Y-%m-%d")
        
        # Determine status
        if days_remaining <= 7:
            status = "Critical"
        elif days_remaining <= 14:
            status = "Low"
        elif days_remaining <= 60:
            status = "Normal"
        else:
            status = "Overstocked"
        
        projections.append(ProductLifeProjection(
            item_id=item.id,
            item_code=item.item_code,
            item_name=item.name,
            category=item.category.name if item.category else "Uncategorized",
            current_stock=total_stock,
            average_daily_usage=round(avg_daily, 2),
            projected_days_remaining=days_remaining,
            projected_reorder_date=projected_reorder,
            lead_time_days=lead_time,
            recommended_reorder_date=recommended_reorder,
            status=status
        ))
    
    # Sort by days remaining (most critical first)
    projections.sort(key=lambda x: x.projected_days_remaining)
    
    return projections


@router.get("/cost-of-goods", response_model=COGReport)
async def get_cost_of_goods_report(
    days: int = Query(30, ge=1, le=365, description="Period in days to analyze"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Cost of Goods (COG) report showing actual costs of items used/consumed.
    Includes projections for monthly and yearly costs.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all items with usage in the period
    items_query = db.query(Item).filter(Item.is_active == True)
    if category_id:
        items_query = items_query.filter(Item.category_id == category_id)
    items = items_query.all()
    
    cog_items = []
    total_cost = 0.0
    category_costs = {}
    
    for item in items:
        # Get movements (usage) for this item
        movements = db.query(InventoryMovement).filter(
            InventoryMovement.item_id == item.id,
            InventoryMovement.created_at >= start_date
        ).all()
        
        total_used = 0
        for movement in movements:
            if movement.from_location_id and not movement.to_location_id:
                total_used += movement.quantity
        
        if total_used == 0:
            continue
        
        unit_cost = float(item.cost_per_unit or 0)
        cost_used = total_used * unit_cost
        
        # Calculate rates
        monthly_rate = (cost_used / days) * 30 if days > 0 else 0
        yearly_rate = monthly_rate * 12
        
        total_cost += cost_used
        
        # Aggregate by category
        cat_name = item.category.name if item.category else "Uncategorized"
        cat_id = item.category_id or "UNCATEGORIZED"
        if cat_id not in category_costs:
            category_costs[cat_id] = {
                "category_id": cat_id,
                "category_name": cat_name,
                "total_items_used": 0,
                "total_cost": 0.0
            }
        category_costs[cat_id]["total_items_used"] += 1
        category_costs[cat_id]["total_cost"] += cost_used
        
        cog_items.append(COGItem(
            item_id=item.id,
            item_code=item.item_code,
            item_name=item.name,
            category=cat_name,
            unit_cost=unit_cost,
            total_used=total_used,
            total_cost_used=round(cost_used, 2),
            period_days=days,
            monthly_cost_rate=round(monthly_rate, 2),
            yearly_projected_cost=round(yearly_rate, 2)
        ))
    
    # Sort by cost (highest first)
    cog_items.sort(key=lambda x: x.total_cost_used, reverse=True)
    
    # Calculate totals
    avg_daily = total_cost / days if days > 0 else 0
    projected_monthly = avg_daily * 30
    projected_yearly = projected_monthly * 12
    
    # Sort categories by cost
    categories_sorted = sorted(category_costs.values(), key=lambda x: x["total_cost"], reverse=True)
    
    return COGReport(
        period_days=days,
        total_items_used=len(cog_items),
        total_cost_of_goods_used=round(total_cost, 2),
        average_daily_cog=round(avg_daily, 2),
        projected_monthly_cog=round(projected_monthly, 2),
        projected_yearly_cog=round(projected_yearly, 2),
        by_category=categories_sorted,
        top_cost_items=cog_items[:20]  # Top 20 by cost
    )


@router.get("/usage-history-detail")
async def get_detailed_usage_history(
    days: int = Query(30, ge=7, le=365, description="Period in days"),
    item_id: Optional[UUID] = Query(None, description="Filter by specific item"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=200, description="Max items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed usage history with daily breakdown and trends.
    Useful for identifying usage patterns and seasonality.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get items to analyze
    items_query = db.query(Item).filter(Item.is_active == True)
    if item_id:
        items_query = items_query.filter(Item.id == item_id)
    if category_id:
        items_query = items_query.filter(Item.category_id == category_id)
    items = items_query.all()
    
    detailed_reports = []
    
    for item in items:
        # Get all movements for this item
        movements = db.query(InventoryMovement).filter(
            InventoryMovement.item_id == item.id,
            InventoryMovement.created_at >= start_date
        ).order_by(InventoryMovement.created_at).all()
        
        if not movements:
            continue
        
        # Aggregate by day
        daily_data = {}
        for movement in movements:
            day_key = movement.created_at.strftime("%Y-%m-%d")
            if day_key not in daily_data:
                daily_data[day_key] = {"used": 0, "received": 0, "count": 0}
            
            if movement.from_location_id and not movement.to_location_id:
                daily_data[day_key]["used"] += movement.quantity
            elif movement.to_location_id and not movement.from_location_id:
                daily_data[day_key]["received"] += movement.quantity
            
            daily_data[day_key]["count"] += 1
        
        # Calculate totals and find peak
        total_used = 0
        total_received = 0
        peak_day = None
        peak_amount = 0
        
        daily_history = []
        for date_str, data in sorted(daily_data.items()):
            total_used += data["used"]
            total_received += data["received"]
            
            if data["used"] > peak_amount:
                peak_amount = data["used"]
                peak_day = date_str
            
            daily_history.append(UsageHistoryEntry(
                date=date_str,
                total_used=data["used"],
                total_received=data["received"],
                net_change=data["received"] - data["used"],
                movements_count=data["count"]
            ))
        
        # Calculate trend (compare first half vs second half)
        mid = len(daily_history) // 2
        if mid > 0:
            first_half_usage = sum(d.total_used for d in daily_history[:mid])
            second_half_usage = sum(d.total_used for d in daily_history[mid:])
            
            if second_half_usage > first_half_usage * 1.1:
                trend = "Increasing"
            elif second_half_usage < first_half_usage * 0.9:
                trend = "Decreasing"
            else:
                trend = "Stable"
        else:
            trend = "Stable"
        
        avg_daily = total_used / days if days > 0 else 0
        
        detailed_reports.append({
            "item_id": str(item.id),
            "item_code": item.item_code,
            "item_name": item.name,
            "category": item.category.name if item.category else "Uncategorized",
            "period_days": days,
            "total_used": total_used,
            "total_received": total_received,
            "average_daily_usage": round(avg_daily, 2),
            "peak_usage_day": peak_day,
            "peak_usage_amount": peak_amount,
            "trend": trend,
            "daily_history": [
                {
                    "date": h.date,
                    "total_used": h.total_used,
                    "total_received": h.total_received,
                    "net_change": h.net_change,
                    "movements_count": h.movements_count
                }
                for h in daily_history
            ]
        })
    
    # Sort by total usage
    detailed_reports.sort(key=lambda x: x["total_used"], reverse=True)
    
    return detailed_reports[:limit]


@router.get("/expiration-tracking", response_model=ExpirationReport)
async def get_expiration_tracking(
    days_ahead: int = Query(90, ge=1, le=365, description="Look ahead days"),
    include_expired: bool = Query(True, description="Include already expired items"),
    location_id: Optional[UUID] = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get expiration tracking report for items with expiration dates.
    Shows expired, critical (<7 days), and warning (<30 days) items.
    """
    from app.models.inventory_item import InventoryItem
    
    now = datetime.utcnow()
    future_date = now + timedelta(days=days_ahead)
    
    # Query inventory items with expiration tracking
    query = db.query(
        InventoryItem,
        Item,
        Location
    ).join(
        Item, InventoryItem.item_id == Item.id
    ).join(
        Location, InventoryItem.location_id == Location.id
    ).filter(
        InventoryItem.expiration_date.isnot(None),
        Item.is_active == True,
        Location.is_active == True
    )
    
    if location_id:
        query = query.filter(InventoryItem.location_id == location_id)
    
    if not include_expired:
        query = query.filter(InventoryItem.expiration_date >= now)
    
    # Get items expiring within the window
    query = query.filter(InventoryItem.expiration_date <= future_date)
    
    results = query.all()
    
    # Group by item+location+expiration_date for counting
    grouped_items = {}
    
    for inv_item, item, location in results:
        # Each InventoryItem record represents one physical item
        # Group by item_id + location_id + expiration_date to count quantities
        key = f"{item.id}_{location.id}_{inv_item.expiration_date.strftime('%Y-%m-%d') if inv_item.expiration_date else 'none'}"
        
        if key not in grouped_items:
            grouped_items[key] = {
                "item": item,
                "location": location,
                "expiration_date": inv_item.expiration_date,
                "quantity": 0
            }
        grouped_items[key]["quantity"] += 1
    
    alerts = []
    total_expired = 0
    total_critical = 0
    total_warning = 0
    total_at_risk_value = 0.0
    
    for key, data in grouped_items.items():
        item = data["item"]
        location = data["location"]
        exp_date = data["expiration_date"]
        quantity = data["quantity"]
        
        if quantity <= 0:
            continue
        
        days_until = (exp_date - now).days
        
        # Determine status
        if days_until < 0:
            status = "Expired"
            total_expired += 1
        elif days_until <= 7:
            status = "Critical"
            total_critical += 1
        elif days_until <= 30:
            status = "Warning"
            total_warning += 1
        else:
            status = "OK"
        
        # Calculate value at risk
        unit_cost = float(item.cost_per_unit or 0)
        value = quantity * unit_cost
        
        if status in ["Expired", "Critical", "Warning"]:
            total_at_risk_value += value
        
        alerts.append(ExpirationAlert(
            item_id=item.id,
            item_code=item.item_code,
            item_name=item.name,
            location_id=location.id,
            location_name=location.name,
            expiration_date=exp_date.strftime("%Y-%m-%d"),
            days_until_expiration=days_until,
            quantity=quantity,
            estimated_value=round(value, 2),
            status=status
        ))
    
    # Sort by days until expiration (most urgent first)
    alerts.sort(key=lambda x: x.days_until_expiration)
    
    return ExpirationReport(
        total_expiring_items=len(alerts),
        total_expired=total_expired,
        total_critical=total_critical,
        total_warning=total_warning,
        total_at_risk_value=round(total_at_risk_value, 2),
        items=alerts
    )


@router.get("/inventory-turnover")
async def get_inventory_turnover(
    days: int = Query(30, ge=7, le=365, description="Period to analyze"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get inventory turnover analysis showing how quickly items are used and replenished.
    Higher turnover indicates more efficient inventory management.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    items_query = db.query(Item).filter(Item.is_active == True)
    if category_id:
        items_query = items_query.filter(Item.category_id == category_id)
    items = items_query.all()
    
    turnover_data = []
    
    for item in items:
        # Get current stock
        inventory_records = db.query(InventoryCurrent).filter(
            InventoryCurrent.item_id == item.id
        ).all()
        
        current_stock = sum(inv.quantity_on_hand for inv in inventory_records)
        if current_stock <= 0:
            continue
        
        # Get usage in period
        movements = db.query(InventoryMovement).filter(
            InventoryMovement.item_id == item.id,
            InventoryMovement.created_at >= start_date
        ).all()
        
        total_used = 0
        total_received = 0
        for mov in movements:
            if mov.from_location_id and not mov.to_location_id:
                total_used += mov.quantity
            elif mov.to_location_id and not mov.from_location_id:
                total_received += mov.quantity
        
        # Calculate turnover ratio (annualized)
        # Turnover = Cost of Goods Used / Average Inventory
        avg_inventory = current_stock  # Simplified - would ideally use average over period
        annualization_factor = 365 / days
        
        if avg_inventory > 0:
            turnover_ratio = (total_used / avg_inventory) * annualization_factor
        else:
            turnover_ratio = 0
        
        # Days of supply (how long current stock will last)
        avg_daily_usage = total_used / days if days > 0 else 0
        days_of_supply = current_stock / avg_daily_usage if avg_daily_usage > 0 else 999
        
        # Classify efficiency
        if turnover_ratio >= 12:
            efficiency = "Excellent"
        elif turnover_ratio >= 6:
            efficiency = "Good"
        elif turnover_ratio >= 2:
            efficiency = "Fair"
        else:
            efficiency = "Slow Moving"
        
        turnover_data.append({
            "item_id": str(item.id),
            "item_code": item.item_code,
            "item_name": item.name,
            "category": item.category.name if item.category else "Uncategorized",
            "current_stock": current_stock,
            "total_used": total_used,
            "total_received": total_received,
            "turnover_ratio": round(turnover_ratio, 2),
            "days_of_supply": round(days_of_supply, 1),
            "avg_daily_usage": round(avg_daily_usage, 2),
            "efficiency": efficiency
        })
    
    # Sort by turnover ratio (highest first - most active items)
    turnover_data.sort(key=lambda x: x["turnover_ratio"], reverse=True)
    
    # Calculate summary stats
    if turnover_data:
        avg_turnover = sum(d["turnover_ratio"] for d in turnover_data) / len(turnover_data)
        slow_moving = [d for d in turnover_data if d["efficiency"] == "Slow Moving"]
        excellent = [d for d in turnover_data if d["efficiency"] == "Excellent"]
    else:
        avg_turnover = 0
        slow_moving = []
        excellent = []
    
    return {
        "period_days": days,
        "total_items_analyzed": len(turnover_data),
        "average_turnover_ratio": round(avg_turnover, 2),
        "slow_moving_items": len(slow_moving),
        "high_turnover_items": len(excellent),
        "items": turnover_data
    }


@router.get("/reorder-forecast")
async def get_reorder_forecast(
    days_ahead: int = Query(30, ge=7, le=90, description="Forecast days ahead"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get reorder forecast showing expected order needs in the upcoming period.
    Helps with budget planning and procurement scheduling.
    """
    # Use historical data to project future needs
    history_days = 30  # Use last 30 days for projection
    start_date = datetime.utcnow() - timedelta(days=history_days)
    
    items_query = db.query(Item).filter(Item.is_active == True)
    if category_id:
        items_query = items_query.filter(Item.category_id == category_id)
    items = items_query.all()
    
    forecast_data = []
    total_projected_cost = 0.0
    
    for item in items:
        # Get current stock
        inventory_records = db.query(InventoryCurrent).filter(
            InventoryCurrent.item_id == item.id
        ).all()
        current_stock = sum(inv.quantity_on_hand - inv.quantity_allocated for inv in inventory_records)
        
        # Get historical usage
        movements = db.query(InventoryMovement).filter(
            InventoryMovement.item_id == item.id,
            InventoryMovement.created_at >= start_date
        ).all()
        
        total_used = 0
        for mov in movements:
            if mov.from_location_id and not mov.to_location_id:
                total_used += mov.quantity
        
        avg_daily_usage = total_used / history_days if history_days > 0 else 0
        
        if avg_daily_usage <= 0:
            continue
        
        # Project usage for forecast period
        projected_usage = avg_daily_usage * days_ahead
        projected_stock_at_end = current_stock - projected_usage
        
        # Get par level for reorder calculation
        par_levels = db.query(ParLevel).filter(ParLevel.item_id == item.id).all()
        total_par = sum(p.par_quantity for p in par_levels)
        total_reorder = sum(p.reorder_quantity for p in par_levels)
        
        # Will we need to reorder?
        needs_reorder = projected_stock_at_end < total_reorder
        
        if needs_reorder:
            # Calculate quantity to order
            quantity_to_order = max(total_par - projected_stock_at_end, 0)
            lead_time = int(item.lead_time_days or 7)
            
            # When to order
            days_until_reorder = max(0, (current_stock - total_reorder) / avg_daily_usage) if avg_daily_usage > 0 else 0
            reorder_date = (datetime.utcnow() + timedelta(days=days_until_reorder)).strftime("%Y-%m-%d")
            
            unit_cost = float(item.cost_per_unit or 0)
            order_cost = quantity_to_order * unit_cost
            total_projected_cost += order_cost
            
            forecast_data.append({
                "item_id": str(item.id),
                "item_code": item.item_code,
                "item_name": item.name,
                "category": item.category.name if item.category else "Uncategorized",
                "current_stock": int(current_stock),
                "projected_usage": round(projected_usage, 1),
                "projected_stock_at_end": round(projected_stock_at_end, 1),
                "par_level": total_par,
                "reorder_point": total_reorder,
                "quantity_to_order": int(quantity_to_order),
                "lead_time_days": lead_time,
                "suggested_reorder_date": reorder_date,
                "unit_cost": unit_cost,
                "projected_order_cost": round(order_cost, 2),
                "urgency": "High" if projected_stock_at_end <= 0 else "Medium" if projected_stock_at_end < total_reorder else "Low"
            })
    
    # Sort by urgency then by projected order cost
    urgency_order = {"High": 0, "Medium": 1, "Low": 2}
    forecast_data.sort(key=lambda x: (urgency_order[x["urgency"]], -x["projected_order_cost"]))
    
    return {
        "forecast_period_days": days_ahead,
        "total_items_needing_reorder": len(forecast_data),
        "total_projected_cost": round(total_projected_cost, 2),
        "items": forecast_data
    }

