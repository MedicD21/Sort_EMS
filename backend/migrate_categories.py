"""
Database migration script to update categories table and items.category_id

This script:
1. Drops and recreates categories table with string IDs
2. Updates items.category_id from UUID to String
3. Populates standard EMS categories
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal, engine
from app.models.item import Category, Item
from sqlalchemy import text

# Standard EMS categories
STANDARD_CATEGORIES = [
    {
        "id": "AIRWAY",
        "name": "Airway Management",
        "description": "Airway devices, intubation equipment, suction",
        "color": "#2196F3",
        "sort_order": 1
    },
    {
        "id": "BREATHING",
        "name": "Breathing & Oxygen",
        "description": "Oxygen equipment, ventilation devices, nebulizers",
        "color": "#03A9F4",
        "sort_order": 2
    },
    {
        "id": "CARDIAC",
        "name": "Cardiac Care",
        "description": "Defibrillators, ECG equipment, cardiac medications",
        "color": "#F44336",
        "sort_order": 3
    },
    {
        "id": "TRAUMA",
        "name": "Trauma Supplies",
        "description": "Bandages, splints, bleeding control, c-collars",
        "color": "#FF5722",
        "sort_order": 4
    },
    {
        "id": "IV_FLUIDS",
        "name": "IV & Fluids",
        "description": "IV catheters, fluids, tubings, pumps",
        "color": "#9C27B0",
        "sort_order": 5
    },
    {
        "id": "MEDICATIONS",
        "name": "Medications",
        "description": "Emergency drugs, narcotics, controlled substances",
        "color": "#4CAF50",
        "sort_order": 6
    },
    {
        "id": "DIAGNOSTIC",
        "name": "Diagnostic Equipment",
        "description": "Blood pressure, pulse oximeter, thermometers, glucometers",
        "color": "#FF9800",
        "sort_order": 7
    },
    {
        "id": "INFECTION_CONTROL",
        "name": "Infection Control",
        "description": "PPE, gloves, masks, hand sanitizer, disinfectants",
        "color": "#00BCD4",
        "sort_order": 8
    },
    {
        "id": "OB_GYN",
        "name": "OB/GYN",
        "description": "Obstetric kits, delivery supplies",
        "color": "#E91E63",
        "sort_order": 9
    },
    {
        "id": "PEDIATRIC",
        "name": "Pediatric Equipment",
        "description": "Pediatric-specific devices and supplies",
        "color": "#FFC107",
        "sort_order": 10
    },
    {
        "id": "BURNS",
        "name": "Burn Care",
        "description": "Burn sheets, dressings, specialized burn treatments",
        "color": "#FF6F00",
        "sort_order": 11
    },
    {
        "id": "EXTRACTION",
        "name": "Extraction & Rescue",
        "description": "Extrication equipment, rescue tools, backboards",
        "color": "#795548",
        "sort_order": 12
    },
    {
        "id": "COMMUNICATION",
        "name": "Communication",
        "description": "Radios, phones, alert devices",
        "color": "#607D8B",
        "sort_order": 13
    },
    {
        "id": "DOCUMENTATION",
        "name": "Documentation",
        "description": "Forms, tablets, printers, pens",
        "color": "#9E9E9E",
        "sort_order": 14
    },
    {
        "id": "GENERAL",
        "name": "General Supplies",
        "description": "Miscellaneous supplies and equipment",
        "color": "#757575",
        "sort_order": 99
    }
]


def migrate_database():
    """Perform database migration"""
    db = SessionLocal()
    
    try:
        print("Starting database migration...")
        
        # Step 1: Drop existing categories table and recreate
        print("\n1. Recreating categories table...")
        
        # SQLite: Disable foreign keys temporarily
        db.execute(text("PRAGMA foreign_keys = OFF"))
        db.commit()
        
        db.execute(text("DROP TABLE IF EXISTS categories"))
        db.commit()
        
        # Create new categories table
        db.execute(text("""
            CREATE TABLE categories (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description VARCHAR(500),
                color VARCHAR(7),
                sort_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        """))
        db.commit()
        print("✓ Categories table recreated")
        
        # Step 2: Update items table
        print("\n2. Updating items.category_id column...")
        
        # Clear existing category_id values (since we're changing format)
        db.execute(text("UPDATE items SET category_id = NULL"))
        db.commit()
        
        # SQLite doesn't support ALTER COLUMN TYPE directly, so we need to recreate
        # For now, we'll just clear the values since they're already stored as strings in SQLite
        print("✓ Items table updated (category_id cleared)")
        
        # Re-enable foreign keys
        db.execute(text("PRAGMA foreign_keys = ON"))
        db.commit()
        
        # Step 3: Insert standard categories
        print("\n3. Inserting standard EMS categories...")
        for cat_data in STANDARD_CATEGORIES:
            category = Category(**cat_data)
            db.add(category)
        db.commit()
        print(f"✓ Inserted {len(STANDARD_CATEGORIES)} standard categories")
        
        # Step 4: Show created categories
        print("\n4. Categories created:")
        categories = db.query(Category).order_by(Category.sort_order).all()
        for cat in categories:
            print(f"   - {cat.id:20} | {cat.name:30} | {cat.color}")
        
        print("\n✅ Migration completed successfully!")
        print("\nNote: All existing items have had their category_id cleared.")
        print("You can now assign categories using the new string IDs (e.g., 'TRAUMA', 'AIRWAY').")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 70)
    print("EMS Supply System - Category Migration")
    print("=" * 70)
    
    response = input("\n⚠️  This will drop and recreate the categories table.\n"
                    "   All items will have their category_id cleared.\n"
                    "   Continue? (yes/no): ")
    
    if response.lower() == "yes":
        migrate_database()
    else:
        print("\nMigration cancelled.")
