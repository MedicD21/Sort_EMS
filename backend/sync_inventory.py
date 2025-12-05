"""Sync inventory_current with items table"""
import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.inventory import InventoryCurrent
from app.models.location import Location
from app.models.item import Item

db = SessionLocal()

try:
    # Get default location (Supply Station)
    default_location = db.query(Location).filter(Location.name == "Supply Station").first()
    if not default_location:
        default_location = db.query(Location).first()
    
    if not default_location:
        print("ERROR: No locations found in database!")
        sys.exit(1)
    
    print(f"Using default location: {default_location.name}")
    
    # Clear old inventory records
    print("Clearing old inventory records...")
    db.query(InventoryCurrent).delete()
    db.commit()
    
    # Get all items
    items = db.query(Item).all()
    print(f"Creating inventory records for {len(items)} items...")
    
    created_count = 0
    for item in items:
        # Create inventory record with quantity 0
        inv = InventoryCurrent(
            item_id=item.id,
            location_id=default_location.id,
            quantity_on_hand=0,
            quantity_allocated=0
        )
        db.add(inv)
        created_count += 1
    
    db.commit()
    print(f"Successfully created {created_count} inventory records!")
    
except Exception as e:
    print(f"ERROR: {e}")
    db.rollback()
finally:
    db.close()
