import sqlite3

conn = sqlite3.connect('ems_supply.db')
cur = conn.cursor()

# Check total count
cur.execute('SELECT COUNT(*) FROM inventory_current')
print(f"Total inventory_current: {cur.fetchone()[0]}")

# Check Supply Station count
cur.execute("SELECT COUNT(*) FROM inventory_current WHERE location_id = '440b02a6-f55e-4a12-9a18-4677694e8ce5'")
print(f"Supply Station inventory: {cur.fetchone()[0]}")

# Check all unique location_ids
cur.execute("SELECT DISTINCT location_id FROM inventory_current")
print(f"Unique location IDs: {[row[0] for row in cur.fetchall()]}")

conn.close()
