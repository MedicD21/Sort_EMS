"""
Test script to view database contents
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.item import Item
from app.models.location import Location
from app.models.par_level import ParLevel

def main():
    db = SessionLocal()
    
    try:
        print("\n" + "="*60)
        print("📦 EMS SUPPLY TRACKING - DATABASE CONTENTS")
        print("="*60)
        
        # Count records
        item_count = db.query(Item).count()
        location_count = db.query(Location).count()
        par_count = db.query(ParLevel).count()
        
        print(f"\n📊 SUMMARY:")
        print(f"   Total Items: {item_count}")
        print(f"   Total Locations: {location_count}")
        print(f"   Total Par Levels: {par_count}")
        
        # Show locations
        print(f"\n📍 LOCATIONS:")
        locations = db.query(Location).all()
        for loc in locations:
            parent = f" (parent: {loc.parent_location.name})" if loc.parent_location else ""
            print(f"   • {loc.name} [{loc.type}]{parent}")
        
        # Show first 15 items
        print(f"\n📦 FIRST 15 ITEMS:")
        items = db.query(Item).limit(15).all()
        for item in items:
            print(f"   • {item.item_code}: {item.name} ({item.unit_of_measure})")
        
        if item_count > 15:
            print(f"   ... and {item_count - 15} more items")
        
        # Show par levels
        if par_count > 0:
            print(f"\n⚖️ SAMPLE PAR LEVELS:")
            pars = db.query(ParLevel).limit(10).all()
            for par in pars:
                print(f"   • {par.item.name} @ {par.location.name}")
                print(f"     Par: {par.par_quantity}, Reorder: {par.reorder_quantity}")
        
        print("\n" + "="*60)
        print("✅ Database check complete!")
        print("="*60 + "\n")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
