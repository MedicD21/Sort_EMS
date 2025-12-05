"""
Setup proper location hierarchy and inventory records for each location
"""
from app.core.database import SessionLocal
from app.models.location import Location, LocationType
from app.models.item import Item
from app.models.inventory import InventoryCurrent
from app.models.par_level import ParLevel
from sqlalchemy import delete

def setup_locations():
    db = SessionLocal()
    
    try:
        # Clear existing locations
        print("Clearing existing locations...")
        db.execute(delete(InventoryCurrent))
        db.execute(delete(ParLevel))
        db.execute(delete(Location))
        db.commit()
        
        # Create new location structure
        print("\nCreating new locations...")
        locations = []
        
        # Supply Station (no truck)
        supply_station = Location(
            name="Supply Station",
            type=LocationType.SUPPLY_STATION,
            is_active=True
        )
        locations.append(supply_station)
        db.add(supply_station)
        
        # Stations 1-11 with Cabinet and Truck
        for i in range(1, 12):
            # Cabinet
            cabinet = Location(
                name=f"Station {i} Cabinet",
                type=LocationType.STATION_CABINET,
                is_active=True
            )
            locations.append(cabinet)
            db.add(cabinet)
            
            # Truck
            truck = Location(
                name=f"Station {i} Truck",
                type=LocationType.VEHICLE,
                is_active=True
            )
            locations.append(truck)
            db.add(truck)
        
        db.commit()
        print(f"Created {len(locations)} locations")
        
        # Get all items
        items = db.query(Item).all()
        print(f"\nFound {len(items)} items")
        
        # Create inventory records for each item at each location
        print("\nCreating inventory records...")
        inventory_count = 0
        par_level_count = 0
        
        for item in items:
            for location in locations:
                # Create inventory record with 0 stock
                inv = InventoryCurrent(
                    item_id=item.id,
                    location_id=location.id,
                    quantity_on_hand=0,
                    quantity_allocated=0
                )
                db.add(inv)
                inventory_count += 1
                
                # Create par level record
                par = ParLevel(
                    item_id=item.id,
                    location_id=location.id,
                    par_quantity=0,
                    reorder_quantity=0,
                    max_quantity=0
                )
                db.add(par)
                par_level_count += 1
        
        db.commit()
        print(f"Created {inventory_count} inventory records")
        print(f"Created {par_level_count} par level records")
        
        # Display summary
        print("\n=== Setup Complete ===")
        print(f"Locations: {len(locations)}")
        for loc in locations:
            print(f"  - {loc.name}")
        print(f"\nItems: {len(items)}")
        print(f"Inventory records: {inventory_count}")
        print(f"Par level records: {par_level_count}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_locations()
