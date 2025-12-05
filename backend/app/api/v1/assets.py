"""
Asset API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from ...core.database import get_db
from ...models.asset import Asset
from ...models.employee import Employee
from ...schemas.asset import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/", response_model=AssetResponse, status_code=201)
async def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    """Create a new asset"""
    # Check if asset_tag already exists
    existing = db.query(Asset).filter(Asset.asset_tag == asset.asset_tag).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset tag already exists")
    
    # Validate employee_id if provided
    if asset.employee_id:
        employee = db.query(Employee).filter(Employee.id == asset.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # If assigning to employee, set assigned_date if not provided
        asset_data = asset.model_dump()
        if not asset_data.get("assigned_date"):
            asset_data["assigned_date"] = datetime.utcnow()
        if asset_data.get("status") == "Available":
            asset_data["status"] = "Assigned"
    else:
        asset_data = asset.model_dump()
    
    db_asset = Asset(**asset_data)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    # Add employee name to response
    result = AssetResponse.model_validate(db_asset)
    if db_asset.employee:
        result.employee_name = f"{db_asset.employee.first_name} {db_asset.employee.last_name}"
    
    return result


@router.get("/", response_model=List[AssetResponse])
async def list_assets(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[str] = None,
    condition: Optional[str] = None,
    employee_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all assets with optional filters"""
    query = db.query(Asset).options(joinedload(Asset.employee))
    
    if category:
        query = query.filter(Asset.category == category)
    
    if status:
        query = query.filter(Asset.status == status)
    
    if condition:
        query = query.filter(Asset.condition == condition)
    
    if employee_id:
        query = query.filter(Asset.employee_id == employee_id)
    
    if is_active is not None:
        query = query.filter(Asset.is_active == is_active)
    
    if search:
        query = query.filter(
            (Asset.name.ilike(f"%{search}%")) |
            (Asset.asset_tag.ilike(f"%{search}%")) |
            (Asset.description.ilike(f"%{search}%")) |
            (Asset.serial_number.ilike(f"%{search}%")) |
            (Asset.manufacturer.ilike(f"%{search}%")) |
            (Asset.model.ilike(f"%{search}%"))
        )
    
    query = query.order_by(Asset.asset_tag)
    assets = query.offset(skip).limit(limit).all()
    
    # Add employee names to response
    results = []
    for asset in assets:
        result = AssetResponse.model_validate(asset)
        if asset.employee:
            result.employee_name = f"{asset.employee.first_name} {asset.employee.last_name}"
        results.append(result)
    
    return results


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, db: Session = Depends(get_db)):
    """Get a specific asset by ID"""
    asset = db.query(Asset).options(joinedload(Asset.employee)).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    result = AssetResponse.model_validate(asset)
    if asset.employee:
        result.employee_name = f"{asset.employee.first_name} {asset.employee.last_name}"
    
    return result


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    asset_update: AssetUpdate,
    db: Session = Depends(get_db)
):
    """Update an asset"""
    db_asset = db.query(Asset).options(joinedload(Asset.employee)).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = asset_update.model_dump(exclude_unset=True)
    
    # Check for duplicate asset_tag if being updated
    if "asset_tag" in update_data:
        existing = db.query(Asset).filter(
            Asset.asset_tag == update_data["asset_tag"],
            Asset.id != asset_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Asset tag already exists")
    
    # Validate employee_id if being updated
    if "employee_id" in update_data:
        if update_data["employee_id"]:
            employee = db.query(Employee).filter(Employee.id == update_data["employee_id"]).first()
            if not employee:
                raise HTTPException(status_code=404, detail="Employee not found")
            
            # Set assigned_date if not already set
            if not db_asset.assigned_date or db_asset.employee_id != update_data["employee_id"]:
                update_data["assigned_date"] = datetime.utcnow()
            
            # Update status to Assigned if it was Available
            if db_asset.status == "Available":
                update_data["status"] = "Assigned"
        else:
            # Unassigning asset
            update_data["assigned_date"] = None
            if db_asset.status == "Assigned":
                update_data["status"] = "Available"
    
    for field, value in update_data.items():
        setattr(db_asset, field, value)
    
    db_asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_asset)
    
    result = AssetResponse.model_validate(db_asset)
    if db_asset.employee:
        result.employee_name = f"{db_asset.employee.first_name} {db_asset.employee.last_name}"
    
    return result


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    """Delete an asset (soft delete by setting is_active=False)"""
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Soft delete
    db_asset.is_active = False
    db_asset.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Asset deactivated successfully"}


@router.delete("/{asset_id}/hard")
async def hard_delete_asset(asset_id: str, db: Session = Depends(get_db)):
    """Permanently delete an asset"""
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(db_asset)
    db.commit()
    
    return {"message": "Asset permanently deleted"}


@router.post("/{asset_id}/assign/{employee_id}")
async def assign_asset_to_employee(
    asset_id: str,
    employee_id: str,
    db: Session = Depends(get_db)
):
    """Assign an asset to an employee"""
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db_asset.employee_id = employee_id
    db_asset.assigned_date = datetime.utcnow()
    db_asset.status = "Assigned"
    db_asset.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Asset assigned to {employee.first_name} {employee.last_name}"}


@router.post("/{asset_id}/unassign")
async def unassign_asset(asset_id: str, db: Session = Depends(get_db)):
    """Unassign an asset from its current employee"""
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db_asset.employee_id = None
    db_asset.assigned_date = None
    db_asset.status = "Available"
    db_asset.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Asset unassigned successfully"}
