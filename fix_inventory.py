import sqlite3
conn = sqlite3.connect('backend/ems_supply.db')
c = conn.cursor()

# Add missing columns to inventory_current table
columns_to_add = [
    ('expiration_date', 'DATE'),
]

for col, coltype in columns_to_add:
    try:
        c.execute(f'ALTER TABLE inventory_current ADD COLUMN {col} {coltype}')
        print(f'Added column: {col}')
    except sqlite3.OperationalError as e:
        if 'duplicate column' in str(e).lower():
            print(f'Column exists: {col}')
        else:
            print(f'Error adding {col}: {e}')

conn.commit()
conn.close()
print('Done')
