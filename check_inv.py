import sqlite3
conn = sqlite3.connect('backend/ems_supply.db')
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM inventory_current WHERE location_id = '440b02a6-f55e-4a12-9a18-4677694e8ce5'")
print(f'Inventory records at Supply Station: {c.fetchone()[0]}')
c.execute("SELECT SUM(quantity_on_hand) FROM inventory_current WHERE location_id = '440b02a6-f55e-4a12-9a18-4677694e8ce5'")
print(f'Total quantity: {c.fetchone()[0]}')
conn.close()
