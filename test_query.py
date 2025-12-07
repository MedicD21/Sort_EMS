from uuid import UUID
import sqlite3
import sys
sys.path.insert(0, '/app')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Connect directly to see what's happening
engine = create_engine("sqlite:///./ems_supply.db", echo=True)
Session = sessionmaker(bind=engine)
db = Session()

from app.models.inventory import InventoryCurrent

# Try querying with a UUID object
location_uuid = UUID('440b02a6-f55e-4a12-9a18-4677694e8ce5')
print(f"\nQuerying with UUID object: {location_uuid}")
results = db.query(InventoryCurrent).filter(InventoryCurrent.location_id == location_uuid).limit(5).all()
print(f"Results: {len(results)}")

# Try querying with string
location_str = '440b02a6-f55e-4a12-9a18-4677694e8ce5'
print(f"\nQuerying with string: {location_str}")
results2 = db.query(InventoryCurrent).filter(InventoryCurrent.location_id == location_str).limit(5).all()
print(f"Results: {len(results2)}")

db.close()
