"""
Complete database rebuild script
Drops the database and recreates everything from scratch
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

print("=" * 70)
print("DATABASE REBUILD SCRIPT")
print("=" * 70)
print("\n⚠️  This will DELETE the existing database and rebuild from scratch!")
print("    All data will be lost.\n")

response = input("Continue? (type 'yes' to proceed): ")

if response.lower() != "yes":
    print("\nRebuild cancelled.")
    sys.exit(0)

# Remove existing database
db_path = backend_dir / "ems_supply.db"
if db_path.exists():
    print(f"\n🗑️  Removing existing database: {db_path}")
    os.remove(db_path)

# Now create fresh database
print("\n📦 Creating fresh database with all tables...")

from app.core.database import engine, Base
from app.models.item import Category, Item
from app.models.location import Location
from app.models.inventory import InventoryCurrent
from app.models.inventory_item import InventoryItem
from app.models.user import User
from app.models.rfid import RFIDTag
from app.models.par_level import ParLevel
from app.models.order import PurchaseOrder, PurchaseOrderItem
from app.models.audit import AuditLog
from app.models.notification import Notification

# Create all tables
Base.metadata.create_all(bind=engine)
print("✅ Database tables created")

# Populate categories
from app.core.database import SessionLocal

STANDARD_CATEGORIES = [
    {"id": "AIRWAY", "name": "Airway Management", "description": "Airway devices, intubation equipment, suction", "color": "#2196F3", "sort_order": 1},
    {"id": "BREATHING", "name": "Breathing & Oxygen", "description": "Oxygen equipment, ventilation devices, nebulizers", "color": "#03A9F4", "sort_order": 2},
    {"id": "CARDIAC", "name": "Cardiac Care", "description": "Defibrillators, ECG equipment, cardiac medications", "color": "#F44336", "sort_order": 3},
    {"id": "TRAUMA", "name": "Trauma Supplies", "description": "Bandages, splints, bleeding control, c-collars", "color": "#FF5722", "sort_order": 4},
    {"id": "IV_FLUIDS", "name": "IV & Fluids", "description": "IV catheters, fluids, tubings, pumps", "color": "#9C27B0", "sort_order": 5},
    {"id": "MEDICATIONS", "name": "Medications", "description": "Emergency drugs, narcotics, controlled substances", "color": "#4CAF50", "sort_order": 6},
    {"id": "DIAGNOSTIC", "name": "Diagnostic Equipment", "description": "Blood pressure, pulse oximeter, thermometers, glucometers", "color": "#FF9800", "sort_order": 7},
    {"id": "INFECTION_CONTROL", "name": "Infection Control", "description": "PPE, gloves, masks, hand sanitizer, disinfectants", "color": "#00BCD4", "sort_order": 8},
    {"id": "OB_GYN", "name": "OB/GYN", "description": "Obstetric kits, delivery supplies", "color": "#E91E63", "sort_order": 9},
    {"id": "PEDIATRIC", "name": "Pediatric Equipment", "description": "Pediatric-specific devices and supplies", "color": "#FFC107", "sort_order": 10},
    {"id": "BURNS", "name": "Burn Care", "description": "Burn sheets, dressings, specialized burn treatments", "color": "#FF6F00", "sort_order": 11},
    {"id": "EXTRACTION", "name": "Extraction & Rescue", "description": "Extrication equipment, rescue tools, backboards", "color": "#795548", "sort_order": 12},
    {"id": "COMMUNICATION", "name": "Communication", "description": "Radios, phones, alert devices", "color": "#607D8B", "sort_order": 13},
    {"id": "DOCUMENTATION", "name": "Documentation", "description": "Forms, tablets, printers, pens", "color": "#9E9E9E", "sort_order": 14},
    {"id": "GENERAL", "name": "General Supplies", "description": "Miscellaneous supplies and equipment", "color": "#757575", "sort_order": 99}
]

db = SessionLocal()
try:
    print("\n📋 Populating standard EMS categories...")
    for cat_data in STANDARD_CATEGORIES:
        category = Category(**cat_data)
        db.add(category)
    db.commit()
    print(f"✅ Created {len(STANDARD_CATEGORIES)} categories")
    
    print("\n✨ Database rebuild complete!")
    print("\nCategories created:")
    categories = db.query(Category).order_by(Category.sort_order).all()
    for cat in categories:
        print(f"   - {cat.id:20} | {cat.name:30} | {cat.color}")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    db.rollback()
    raise
finally:
    db.close()

print("\n" + "=" * 70)
print("✅ Ready to use! Start the backend server.")
print("=" * 70)
