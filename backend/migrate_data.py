"""
Data migration script to import Excel data into the new system
"""
import pandas as pd
import sys
import os
from uuid import uuid4
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal, engine
from app.models import (
    Location, LocationType, Item, Category, ParLevel,
    InventoryCurrent, User, UserRole
)
from app.core.security import get_password_hash


def create_default_admin():
    """Create default admin user"""
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("Admin user already exists")
            return
        
        admin = User(
            username="admin",
            email="admin@emscompany.com",
            password_hash=get_password_hash("ChangeMe123!"),
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("✓ Created default admin user (username: admin, password: ChangeMe123!)")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()


def create_default_locations():
    """Create default location hierarchy"""
    db = SessionLocal()
    try:
        # Check if locations already exist
        if db.query(Location).count() > 0:
            print("Locations already exist")
            return
        
        # Create Supply Station (main warehouse)
        supply_station = Location(
            name="Main Supply Station",
            type=LocationType.SUPPLY_STATION,
            address="123 EMS Way, Your City, OH",
            is_active=True
        )
        db.add(supply_station)
        db.flush()
        
        # Create Station Cabinet
        station_cabinet = Location(
            name="Station 1 Supply Cabinet",
            type=LocationType.STATION_CABINET,
            parent_location_id=supply_station.id,
            address="Station 1, Your City, OH",
            is_active=True
        )
        db.add(station_cabinet)
        db.flush()
        
        # Create Vehicle (Medic 4)
        medic_4 = Location(
            name="Medic 4",
            type=LocationType.VEHICLE,
            parent_location_id=station_cabinet.id,
            is_active=True
        )
        db.add(medic_4)
        
        db.commit()
        print("✓ Created default locations: Supply Station → Station 1 Cabinet → Medic 4")
        
        return supply_station.id, station_cabinet.id, medic_4.id
    except Exception as e:
        print(f"Error creating locations: {e}")
        db.rollback()
        return None, None, None
    finally:
        db.close()


def create_default_categories():
    """Create default item categories"""
    db = SessionLocal()
    try:
        # Check if categories already exist
        if db.query(Category).count() > 0:
            print("Categories already exist")
            return
        
        categories = [
            "Bandages & Dressings",
            "Airway Management",
            "IV & Fluids",
            "Medications",
            "Diagnostic Equipment",
            "Personal Protective Equipment",
            "Trauma Supplies",
            "Oxygen & Respiratory",
            "Miscellaneous"
        ]
        
        for cat_name in categories:
            category = Category(name=cat_name)
            db.add(category)
        
        db.commit()
        print(f"✓ Created {len(categories)} default categories")
    except Exception as e:
        print(f"Error creating categories: {e}")
        db.rollback()
    finally:
        db.close()


def import_excel_data(excel_file_path):
    """Import items from Excel file"""
    db = SessionLocal()
    try:
        # Read Excel file
        df = pd.read_excel(excel_file_path)
        
        # Rename columns for easier access
        df.columns = ['item_name', 'par', 'reorder_at', 'uom']
        
        # Remove header row if present
        if df.iloc[0]['item_name'] == 'ITEM':
            df = df.iloc[1:]
        
        # Get default category
        default_category = db.query(Category).filter(
            Category.name == "Miscellaneous"
        ).first()
        
        # Get Medic 4 location
        medic_4 = db.query(Location).filter(
            Location.name == "Medic 4"
        ).first()
        
        if not medic_4:
            print("Error: Medic 4 location not found. Run create_default_locations first.")
            return
        
        items_created = 0
        par_levels_created = 0
        
        for _, row in df.iterrows():
            try:
                item_name = str(row['item_name']).strip()
                if not item_name or item_name == 'nan':
                    continue
                
                # Extract item code (e.g., A01 from "A01- 3" Kling...")
                item_code = item_name.split('-')[0].strip() if '-' in item_name else f"ITEM{items_created+1:03d}"
                
                # Get par and reorder values
                par_qty = int(row['par']) if pd.notna(row['par']) and row['par'] != '' else 1
                reorder_qty = int(row['reorder_at']) if pd.notna(row['reorder_at']) and row['reorder_at'] != '' else 0
                uom = str(row['uom']).strip() if pd.notna(row['uom']) else 'EA'
                
                # Check if item already exists
                existing_item = db.query(Item).filter(Item.item_code == item_code).first()
                if existing_item:
                    continue
                
                # Create item
                item = Item(
                    item_code=item_code,
                    name=item_name,
                    category_id=default_category.id if default_category else None,
                    unit_of_measure=uom,
                    requires_expiration_tracking=False,
                    is_controlled_substance=False,
                    is_active=True
                )
                db.add(item)
                db.flush()
                items_created += 1
                
                # Create par level for Medic 4
                par_level = ParLevel(
                    location_id=medic_4.id,
                    item_id=item.id,
                    par_quantity=par_qty,
                    reorder_quantity=reorder_qty if reorder_qty > 0 else max(1, par_qty // 2),
                    max_quantity=par_qty * 2
                )
                db.add(par_level)
                par_levels_created += 1
                
                # Create initial inventory record
                inventory = InventoryCurrent(
                    location_id=medic_4.id,
                    item_id=item.id,
                    quantity_on_hand=0,  # Start with 0, will be updated during physical count
                    quantity_allocated=0
                )
                db.add(inventory)
                
            except Exception as e:
                print(f"Error processing row: {row['item_name']} - {e}")
                continue
        
        db.commit()
        print(f"✓ Imported {items_created} items with {par_levels_created} par levels")
        
    except Exception as e:
        print(f"Error importing Excel data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Main migration function"""
    print("\n" + "="*60)
    print("EMS Supply Tracking - Data Migration")
    print("="*60 + "\n")
    
    # Step 1: Create admin user
    print("Step 1: Creating default admin user...")
    create_default_admin()
    
    # Step 2: Create default locations
    print("\nStep 2: Creating default locations...")
    create_default_locations()
    
    # Step 3: Create default categories
    print("\nStep 3: Creating default categories...")
    create_default_categories()
    
    # Step 4: Import Excel data
    # Try multiple possible paths
    excel_paths = [
        "/Users/dustinschaaf/Desktop/Sort_EMS/Sort_EMS/Medic 4 supply closet 71625.xlsx",
        r"c:\Users\DScha\OneDrive\Desktop\Sort_EMS\Medic 4 supply closet 71625.xlsx",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "Medic 4 supply closet 71625.xlsx")
    ]
    
    excel_file = None
    for path in excel_paths:
        if os.path.exists(path):
            excel_file = path
            break
    
    if excel_file:
        print(f"\nStep 4: Importing data from {os.path.basename(excel_file)}...")
        import_excel_data(excel_file)
    else:
        print(f"\nWarning: Excel file not found. Searched paths:")
        for path in excel_paths:
            print(f"  - {path}")
    
    print("\n" + "="*60)
    print("Migration Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Start the FastAPI server: uvicorn app.main:app --reload")
    print("2. Access API docs at: http://localhost:8000/docs")
    print("3. Login with: username=admin, password=ChangeMe123!")
    print("4. Change the admin password immediately!")
    print("\n")


if __name__ == "__main__":
    main()
