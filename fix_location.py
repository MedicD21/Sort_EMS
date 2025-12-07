import sqlite3
conn = sqlite3.connect('backend/ems_supply.db')
c = conn.cursor()

# Update the location type to match the enum
c.execute("UPDATE locations SET type = 'SUPPLY_STATION' WHERE name = 'Supply Station'")
print(f'Updated {c.rowcount} rows')

conn.commit()
conn.close()
print('Done')
