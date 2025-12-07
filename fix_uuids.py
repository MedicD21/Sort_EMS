"""
Fix UUID format in database - remove hyphens to match SQLAlchemy's hex format
"""
import sqlite3
import re

conn = sqlite3.connect('ems_supply.db')
cur = conn.cursor()

# Tables with UUID columns that need fixing
tables_columns = {
    'inventory_current': ['id', 'location_id', 'item_id', 'last_counted_by'],
    'locations': ['id'],
    'items': ['id', 'category_id'],
    'categories': ['id'],
    'users': ['id'],
    'par_levels': ['id', 'location_id', 'item_id'],
    'inventory_movements': ['id', 'item_id', 'from_location_id', 'to_location_id', 'user_id'],
    'purchase_orders': ['id', 'vendor_id', 'created_by_id', 'approved_by_id'],
    'purchase_order_items': ['id', 'purchase_order_id', 'item_id'],
    'vendors': ['id'],
    'notifications': ['id', 'user_id'],
    'audit_logs': ['id', 'user_id'],
    'internal_orders': ['id', 'requesting_location_id', 'fulfilling_location_id', 'requested_by_id', 'approved_by_id', 'fulfilled_by_id'],
    'internal_order_items': ['id', 'order_id', 'item_id'],
}

def remove_hyphens(uuid_str):
    """Remove hyphens from UUID string if present"""
    if uuid_str and '-' in str(uuid_str):
        return str(uuid_str).replace('-', '')
    return uuid_str

total_updated = 0

for table, columns in tables_columns.items():
    try:
        # Check if table exists
        cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        if not cur.fetchone():
            print(f"Table {table} doesn't exist, skipping")
            continue
        
        for col in columns:
            try:
                # Check if column exists
                cur.execute(f"PRAGMA table_info({table})")
                col_exists = any(row[1] == col for row in cur.fetchall())
                if not col_exists:
                    print(f"Column {table}.{col} doesn't exist, skipping")
                    continue
                
                # Get rows with hyphenated UUIDs
                cur.execute(f"SELECT rowid, {col} FROM {table} WHERE {col} LIKE '%-%'")
                rows = cur.fetchall()
                
                for rowid, uuid_val in rows:
                    if uuid_val and '-' in str(uuid_val):
                        new_val = remove_hyphens(uuid_val)
                        cur.execute(f"UPDATE {table} SET {col} = ? WHERE rowid = ?", (new_val, rowid))
                        total_updated += 1
                
                if rows:
                    print(f"Updated {len(rows)} rows in {table}.{col}")
                    
            except Exception as e:
                print(f"Error processing {table}.{col}: {e}")
                
    except Exception as e:
        print(f"Error processing table {table}: {e}")

conn.commit()
print(f"\nTotal UUIDs converted: {total_updated}")

# Verify the fix
cur.execute("SELECT location_id FROM inventory_current LIMIT 5")
print(f"\nSample location_ids after fix: {[row[0] for row in cur.fetchall()]}")

cur.execute("SELECT id FROM locations LIMIT 5")
print(f"Sample location ids: {[row[0] for row in cur.fetchall()]}")

conn.close()
