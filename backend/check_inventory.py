"""Check inventory current table"""
import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.inventory import InventoryCurrent
from app.models.location import Location
from app.models.item import Item

db = SessionLocal()

# Get first few items
items = db.query(Item).limit(5).all()

print("Checking inventory records:")
for item in items:
    inv_records = db.query(InventoryCurrent).filter(InventoryCurrent.item_id == item.id).all()
    print(f"\nItem: {item.name} (ID: {str(item.id)[:8]}...)")
    print(f"  Inventory records: {len(inv_records)}")
    for inv in inv_records:
        loc = db.query(Location).filter(Location.id == inv.location_id).first()
        print(f"    Location: {loc.name if loc else 'Unknown'}, Stock: {inv.quantity_on_hand}")

db.close()
