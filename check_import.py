import sqlite3

conn = sqlite3.connect('ems_supply.db')
c = conn.cursor()

# Top items by quantity
c.execute("""
    SELECT i.name, i.item_code, ic.quantity_on_hand 
    FROM inventory_current ic 
    JOIN items i ON ic.item_id = i.id 
    JOIN locations l ON ic.location_id = l.id 
    WHERE l.name = 'Supply Station' 
    ORDER BY ic.quantity_on_hand DESC 
    LIMIT 15
""")

print("Top 15 items by quantity at Supply Station:")
print("-" * 100)
for row in c.fetchall():
    print(f"  Qty: {row[2]:5d} | {row[1]:30s} | {row[0][:55]}")

conn.close()
