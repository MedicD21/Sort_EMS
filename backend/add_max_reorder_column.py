"""
Add max_reorder_quantity_per_station column to items table
"""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "ems_supply.db")

def migrate():
    """Add the new column if it doesn't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(items)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "max_reorder_quantity_per_station" not in columns:
        print("Adding max_reorder_quantity_per_station column to items table...")
        cursor.execute("""
            ALTER TABLE items 
            ADD COLUMN max_reorder_quantity_per_station INTEGER
        """)
        conn.commit()
        print("Column added successfully!")
    else:
        print("Column already exists, skipping migration.")
    
    conn.close()

if __name__ == "__main__":
    migrate()
