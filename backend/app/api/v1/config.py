"""
System Configuration API Routes
Manages system-wide settings and restrictions
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter()


# Configuration Models
class AutoOrderConfig(BaseModel):
    enabled: bool = Field(default=True, description="Enable automatic order creation")
    trigger_on_scan: bool = Field(default=True, description="Trigger orders when RFID scan detects low stock")
    trigger_on_manual_check: bool = Field(default=True, description="Trigger orders on manual inventory checks")
    min_order_quantity: int = Field(default=1, ge=1, description="Minimum quantity to order")
    max_order_quantity: int = Field(default=1000, ge=1, description="Maximum quantity per order")
    order_up_to_par: bool = Field(default=True, description="Order up to par level instead of reorder level")
    require_approval: bool = Field(default=False, description="Require manual approval before ordering")


class StationRequestConfig(BaseModel):
    enabled: bool = Field(default=True, description="Allow stations to request items")
    max_request_quantity: int = Field(default=100, ge=1, description="Maximum quantity per station request")
    require_approval: bool = Field(default=False, description="Require approval for station requests")
    auto_create_transfer: bool = Field(default=True, description="Automatically create transfer when approved")
    notification_emails: list[str] = Field(default_factory=list, description="Email addresses for notifications")


class StockAlertConfig(BaseModel):
    enabled: bool = Field(default=True, description="Enable stock level alerts")
    check_on_scan: bool = Field(default=True, description="Check stock levels on RFID scan")
    check_on_transfer: bool = Field(default=True, description="Check stock levels on transfer")
    alert_below_par: bool = Field(default=True, description="Alert when below par level")
    alert_below_reorder: bool = Field(default=True, description="Alert when below reorder level")
    alert_critical_percent: int = Field(default=25, ge=0, le=100, description="Alert when stock is below this % of par")


class TransferRestrictionsConfig(BaseModel):
    require_rfid_scan: bool = Field(default=False, description="Require RFID scan for transfers")
    max_transfer_quantity: int = Field(default=1000, ge=1, description="Maximum quantity per transfer")
    allow_negative_stock: bool = Field(default=False, description="Allow transfers that result in negative stock")
    require_notes_above_quantity: Optional[int] = Field(default=50, description="Require notes for large transfers")


class SystemConfig(BaseModel):
    auto_order: AutoOrderConfig = Field(default_factory=AutoOrderConfig)
    station_requests: StationRequestConfig = Field(default_factory=StationRequestConfig)
    stock_alerts: StockAlertConfig = Field(default_factory=StockAlertConfig)
    transfer_restrictions: TransferRestrictionsConfig = Field(default_factory=TransferRestrictionsConfig)


# In-memory storage (in production, this would be in database)
_system_config = SystemConfig()


@router.get("/", response_model=SystemConfig)
async def get_system_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current system configuration
    """
    return _system_config


@router.put("/", response_model=SystemConfig)
async def update_system_config(
    config: SystemConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update system configuration (admin only)
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    global _system_config
    _system_config = config
    
    return _system_config


@router.put("/auto-order", response_model=AutoOrderConfig)
async def update_auto_order_config(
    config: AutoOrderConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update automatic ordering configuration
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    global _system_config
    _system_config.auto_order = config
    
    return _system_config.auto_order


@router.put("/station-requests", response_model=StationRequestConfig)
async def update_station_request_config(
    config: StationRequestConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update station request configuration
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    global _system_config
    _system_config.station_requests = config
    
    return _system_config.station_requests


@router.put("/stock-alerts", response_model=StockAlertConfig)
async def update_stock_alert_config(
    config: StockAlertConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update stock alert configuration
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    global _system_config
    _system_config.stock_alerts = config
    
    return _system_config.stock_alerts


@router.put("/transfer-restrictions", response_model=TransferRestrictionsConfig)
async def update_transfer_restrictions_config(
    config: TransferRestrictionsConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update transfer restrictions configuration
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    global _system_config
    _system_config.transfer_restrictions = config
    
    return _system_config.transfer_restrictions


@router.get("/validate-transfer")
async def validate_transfer(
    item_id: str,
    from_location_id: str,
    quantity: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate a transfer against current restrictions
    """
    errors = []
    warnings = []
    
    # Check max quantity
    if quantity > _system_config.transfer_restrictions.max_transfer_quantity:
        errors.append(f"Transfer quantity exceeds maximum of {_system_config.transfer_restrictions.max_transfer_quantity}")
    
    # Check if notes required
    if (_system_config.transfer_restrictions.require_notes_above_quantity and 
        quantity > _system_config.transfer_restrictions.require_notes_above_quantity):
        warnings.append(f"Notes recommended for transfers over {_system_config.transfer_restrictions.require_notes_above_quantity} units")
    
    # Check stock availability (would need to query inventory)
    # This is a placeholder - implement actual stock check
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "config": _system_config.transfer_restrictions
    }


@router.get("/validate-order")
async def validate_order(
    quantity: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate an order against current restrictions
    """
    errors = []
    warnings = []
    
    if not _system_config.auto_order.enabled:
        errors.append("Automatic ordering is currently disabled")
    
    if quantity < _system_config.auto_order.min_order_quantity:
        errors.append(f"Order quantity below minimum of {_system_config.auto_order.min_order_quantity}")
    
    if quantity > _system_config.auto_order.max_order_quantity:
        errors.append(f"Order quantity exceeds maximum of {_system_config.auto_order.max_order_quantity}")
    
    if _system_config.auto_order.require_approval:
        warnings.append("This order will require approval before processing")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "config": _system_config.auto_order
    }
