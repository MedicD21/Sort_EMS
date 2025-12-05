"""
CSV Import API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import csv
import io
from datetime import datetime

from ...core.database import get_db
from ...models.item import Item, Category
from ...models.location import Location
from ...models.inventory import InventoryCurrent
from ...models.par_level import ParLevel
from ...schemas.csv_import import (
    CSVImportPreviewResponse,
    CSVImportConflict,
    CSVImportRequest,
    CSVImportResult
)
from app.api.v1.auth import get_current_user
from ...models.user import User

router = APIRouter()

# Store uploaded CSV data temporarily (in production, use Redis or temp files)
csv_upload_cache: Dict[str, List[Dict[str, Any]]] = {}


def parse_boolean(value: str) -> bool:
    """Parse boolean values from CSV"""
    if not value:
        return False
    value = str(value).strip().upper()
    return value in ['TRUE', '1', 'YES', 'Y']


def parse_decimal(value: str) -> float:
    """Parse decimal values from CSV"""
    if not value:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


@router.post("/preview", response_model=CSVImportPreviewResponse)
async def preview_csv_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview CSV import and detect conflicts
    Returns list of conflicts and validation errors
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Read CSV file
    contents = await file.read()
    csv_text = contents.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(csv_text))
    
    rows = list(csv_reader)
    conflicts = []
    errors = []
    new_items = 0
    
    # Store CSV data in cache for later import
    cache_key = f"{current_user.id}_{datetime.utcnow().timestamp()}"
    csv_upload_cache[cache_key] = rows
    
    for idx, row in enumerate(rows, start=2):  # Start at 2 (row 1 is header)
        item_code = row.get('item_code', '').strip()
        
        if not item_code:
            errors.append({
                "row": idx,
                "field": "item_code",
                "error": "Item code is required"
            })
            continue
        
        # Check for existing item
        existing_item = db.query(Item).filter(Item.item_code == item_code).first()
        
        if existing_item:
            conflicts.append(CSVImportConflict(
                item_code=item_code,
                existing_item_name=existing_item.name,
                new_item_name=row.get('name', ''),
                existing_item_id=str(existing_item.id),
                row_number=idx
            ))
        else:
            new_items += 1
        
        # Validate required fields
        if not row.get('name', '').strip():
            errors.append({
                "row": idx,
                "field": "name",
                "error": "Item name is required"
            })
        
        if not row.get('unit_of_measure', '').strip():
            errors.append({
                "row": idx,
                "field": "unit_of_measure",
                "error": "Unit of measure is required"
            })
    
    return CSVImportPreviewResponse(
        total_rows=len(rows),
        new_items=new_items,
        conflicts=conflicts,
        errors=errors
    )


@router.post("/execute", response_model=CSVImportResult)
async def execute_csv_import(
    request: CSVImportRequest,
    cache_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute CSV import with specified conflict resolution
    - conflict_resolution: "skip" to skip conflicting items, "replace" to update them
    - item_codes_to_replace: Optional list of specific item codes to replace
    """
    # Get cached CSV data
    if cache_key not in csv_upload_cache:
        raise HTTPException(status_code=400, detail="CSV data not found. Please upload again.")
    
    rows = csv_upload_cache[cache_key]
    
    created = 0
    updated = 0
    skipped = 0
    errors = []
    
    for idx, row in enumerate(rows, start=2):
        try:
            item_code = row.get('item_code', '').strip()
            
            if not item_code:
                errors.append({
                    "row": idx,
                    "error": "Item code is required"
                })
                skipped += 1
                continue
            
            # Check if item exists
            existing_item = db.query(Item).filter(Item.item_code == item_code).first()
            
            if existing_item:
                # Handle conflict based on resolution strategy
                if request.conflict_resolution == "skip":
                    # Skip unless specifically marked for replacement
                    if request.item_codes_to_replace and item_code in request.item_codes_to_replace:
                        update_item(db, existing_item, row)
                        updated += 1
                    else:
                        skipped += 1
                        continue
                elif request.conflict_resolution == "replace":
                    # Replace unless specifically excluded
                    if request.item_codes_to_replace and item_code not in request.item_codes_to_replace:
                        skipped += 1
                        continue
                    else:
                        update_item(db, existing_item, row)
                        updated += 1
                else:
                    skipped += 1
                    continue
            else:
                # Create new item
                create_item(db, row)
                created += 1
            
            # Handle location-specific data if provided
            location_name = row.get('location_name', '').strip()
            if location_name and existing_item:
                update_location_data(db, existing_item.id if existing_item else None, row, location_name)
        
        except Exception as e:
            errors.append({
                "row": idx,
                "error": str(e)
            })
            skipped += 1
            db.rollback()
            continue
    
    db.commit()
    
    # Clean up cache
    del csv_upload_cache[cache_key]
    
    return CSVImportResult(
        total_rows=len(rows),
        created=created,
        updated=updated,
        skipped=skipped,
        errors=errors
    )


def create_item(db: Session, row: Dict[str, str]) -> Item:
    """Create a new item from CSV row"""
    item = Item(
        item_code=row.get('item_code', '').strip(),
        name=row.get('name', '').strip(),
        description=row.get('description', '').strip() or None,
        category_id=row.get('category_id', '').strip() or None,
        unit_of_measure=row.get('unit_of_measure', '').strip(),
        requires_expiration_tracking=parse_boolean(row.get('requires_expiration_tracking', '')),
        is_controlled_substance=parse_boolean(row.get('is_controlled_substance', '')),
        manufacturer=row.get('manufacturer', '').strip() or None,
        manufacturer_part_number=row.get('manufacturer_part_number', '').strip() or None,
        cost_per_unit=parse_decimal(row.get('cost_per_unit', '')),
        is_active=parse_boolean(row.get('is_active', 'TRUE')),
        supplier_name=row.get('supplier_name', '').strip() or None,
        supplier_contact=row.get('supplier_contact', '').strip() or None,
        supplier_email=row.get('supplier_email', '').strip() or None,
        supplier_phone=row.get('supplier_phone', '').strip() or None,
        supplier_website=row.get('supplier_website', '').strip() or None,
        supplier_account_number=row.get('supplier_account_number', '').strip() or None,
        minimum_order_quantity=parse_decimal(row.get('minimum_order_quantity', '')),
        order_unit=row.get('order_unit', '').strip() or None,
        lead_time_days=parse_decimal(row.get('lead_time_days', '')),
        preferred_vendor=row.get('preferred_vendor', '').strip() or None,
        alternate_vendor=row.get('alternate_vendor', '').strip() or None,
    )
    
    db.add(item)
    db.flush()  # Get the ID
    return item


def update_item(db: Session, item: Item, row: Dict[str, str]):
    """Update existing item from CSV row"""
    item.name = row.get('name', '').strip()
    item.description = row.get('description', '').strip() or None
    item.category_id = row.get('category_id', '').strip() or None
    item.unit_of_measure = row.get('unit_of_measure', '').strip()
    item.requires_expiration_tracking = parse_boolean(row.get('requires_expiration_tracking', ''))
    item.is_controlled_substance = parse_boolean(row.get('is_controlled_substance', ''))
    item.manufacturer = row.get('manufacturer', '').strip() or None
    item.manufacturer_part_number = row.get('manufacturer_part_number', '').strip() or None
    item.cost_per_unit = parse_decimal(row.get('cost_per_unit', ''))
    item.is_active = parse_boolean(row.get('is_active', 'TRUE'))
    item.supplier_name = row.get('supplier_name', '').strip() or None
    item.supplier_contact = row.get('supplier_contact', '').strip() or None
    item.supplier_email = row.get('supplier_email', '').strip() or None
    item.supplier_phone = row.get('supplier_phone', '').strip() or None
    item.supplier_website = row.get('supplier_website', '').strip() or None
    item.supplier_account_number = row.get('supplier_account_number', '').strip() or None
    item.minimum_order_quantity = parse_decimal(row.get('minimum_order_quantity', ''))
    item.order_unit = row.get('order_unit', '').strip() or None
    item.lead_time_days = parse_decimal(row.get('lead_time_days', ''))
    item.preferred_vendor = row.get('preferred_vendor', '').strip() or None
    item.alternate_vendor = row.get('alternate_vendor', '').strip() or None
    item.updated_at = datetime.utcnow()


def update_location_data(db: Session, item_id: str, row: Dict[str, str], location_name: str):
    """Update inventory and par levels for a location"""
    # Find location by name
    location = db.query(Location).filter(Location.name == location_name).first()
    if not location:
        return  # Skip if location not found
    
    # Update current stock if provided
    current_stock = row.get('current_stock', '').strip()
    if current_stock:
        try:
            quantity = int(current_stock)
            inventory = db.query(InventoryCurrent).filter(
                InventoryCurrent.item_id == item_id,
                InventoryCurrent.location_id == location.id
            ).first()
            
            if inventory:
                inventory.quantity_on_hand = quantity
                inventory.updated_at = datetime.utcnow()
            else:
                inventory = InventoryCurrent(
                    item_id=item_id,
                    location_id=location.id,
                    quantity_on_hand=quantity
                )
                db.add(inventory)
        except ValueError:
            pass
    
    # Update par levels if provided
    par_level = row.get('par_level', '').strip()
    reorder_level = row.get('reorder_level', '').strip()
    max_quantity = row.get('max_quantity', '').strip()
    
    if par_level or reorder_level:
        try:
            par_qty = int(par_level) if par_level else 0
            reorder_qty = int(reorder_level) if reorder_level else 0
            max_qty = int(max_quantity) if max_quantity else None
            
            par = db.query(ParLevel).filter(
                ParLevel.item_id == item_id,
                ParLevel.location_id == location.id
            ).first()
            
            if par:
                if par_level:
                    par.par_quantity = par_qty
                if reorder_level:
                    par.reorder_quantity = reorder_qty
                if max_quantity:
                    par.max_quantity = max_qty
                par.updated_at = datetime.utcnow()
            else:
                par = ParLevel(
                    item_id=item_id,
                    location_id=location.id,
                    par_quantity=par_qty,
                    reorder_quantity=reorder_qty,
                    max_quantity=max_qty
                )
                db.add(par)
        except ValueError:
            pass
