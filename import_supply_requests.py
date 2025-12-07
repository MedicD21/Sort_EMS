"""
Script to import supply request items from XML into the EMS Supply database
"""
import xml.etree.ElementTree as ET
import sqlite3
import uuid
from datetime import datetime
import re

def parse_quantity(qty_str):
    """Parse quantity string, handling commas and empty values"""
    if not qty_str or qty_str.strip() == '':
        return 0
    # Remove commas from numbers like "1,859"
    qty_str = qty_str.replace(',', '')
    try:
        return int(qty_str)
    except ValueError:
        return 0

def parse_price(price_str):
    """Parse price string like '$6,860.12' to float"""
    if not price_str or price_str.strip() == '':
        return 0.0
    # Remove $ and commas
    price_str = price_str.replace('$', '').replace(',', '')
    try:
        return float(price_str)
    except ValueError:
        return 0.0

def get_category_from_xml_tag(tag):
    """Convert XML tag to readable category name"""
    # Decode XML-encoded characters
    tag = tag.replace('_x002F_', '/')
    tag = tag.replace('_x0020_', ' ')
    tag = tag.replace('_x0040_', '@')
    tag = tag.replace('_', ' ')
    return tag.strip()

def main():
    # Parse the XML file
    tree = ET.parse('Supply Requests Filled.xml')
    root = tree.getroot()
    
    # Connect to the database
    conn = sqlite3.connect('ems_supply.db')
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    # Get existing items by item_code and name for lookup
    cursor.execute("SELECT id, item_code, name FROM items")
    existing_items = {}
    for row in cursor.fetchall():
        item_id, item_code, name = row
        if item_code:
            existing_items[item_code.upper()] = (item_id, name)
        existing_items[name.upper()] = (item_id, name)
    
    print(f"Found {len(existing_items)} existing items in database")
    
    # Get all locations
    cursor.execute("SELECT id, name FROM locations")
    locations = {row[1]: row[0] for row in cursor.fetchall()}
    
    # Create "Supply Station" location if it doesn't exist
    if "Supply Station" not in locations:
        location_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO locations (id, name, type, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (location_id, "Supply Station", "station", 1, now, now))
        locations["Supply Station"] = location_id
        print("Created 'Supply Station' location")
    
    supply_station_id = locations["Supply Station"]
    
    # Get or create categories
    cursor.execute("SELECT id, name FROM categories")
    categories = {row[1]: row[0] for row in cursor.fetchall()}
    
    def get_or_create_category(name):
        if name in categories:
            return categories[name]
        cat_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO categories (id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        """, (cat_id, name, now, now))
        categories[name] = cat_id
        return cat_id
    
    # Process the Detail section
    detail = root.find('Detail')
    if detail is None:
        print("No Detail section found in XML")
        return
    
    items_processed = 0
    items_created = 0
    items_updated = 0
    inventory_updated = 0
    
    for child in detail:
        category_name = get_category_from_xml_tag(child.tag)
        
        part_desc = child.find('Part_Description')
        part_num = child.find('Part_Number')
        qty = child.find('Quantity')
        total = child.find('Supplied_Total')
        
        # Skip empty entries
        if part_desc is None or not part_desc.text or part_desc.text.strip() == '':
            continue
        
        description = part_desc.text.strip()
        part_number = part_num.text.strip() if part_num is not None and part_num.text else ''
        quantity = parse_quantity(qty.text if qty is not None and qty.text else '0')
        supplied_total = parse_price(total.text if total is not None and total.text else '$0.00')
        
        # Calculate unit price
        unit_price = supplied_total / quantity if quantity > 0 else 0.0
        
        # Skip if quantity is 0
        if quantity == 0:
            continue
        
        items_processed += 1
        
        # Get or create category
        category_id = get_or_create_category(category_name)
        
        # Look for existing item by part number or description
        item_id = None
        if part_number and part_number.upper() in existing_items:
            item_id = existing_items[part_number.upper()][0]
        elif description.upper() in existing_items:
            item_id = existing_items[description.upper()][0]
        
        if item_id is None:
            # Create new item - generate item_code from part number or generate one
            item_code = part_number if part_number else f"IMP-{items_created + 1:04d}"
            # Ensure item_code is unique
            if item_code.upper() in existing_items:
                item_code = f"{item_code}-{uuid.uuid4().hex[:4]}"
            
            item_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO items (id, item_code, name, description, category_id, unit_of_measure, 
                                   cost_per_unit, is_active, requires_expiration_tracking, 
                                   is_controlled_substance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (item_id, item_code, description, description, category_id, 'each', 
                  round(unit_price, 2), 1, 0, 0, now, now))
            existing_items[item_code.upper()] = (item_id, description)
            existing_items[description.upper()] = (item_id, description)
            items_created += 1
        else:
            # Update existing item's category if not set
            cursor.execute("UPDATE items SET category_id = ?, updated_at = ? WHERE id = ? AND category_id IS NULL", 
                          (category_id, now, item_id))
            if cursor.rowcount > 0:
                items_updated += 1
        
        # Check if inventory record exists for this item at Supply Station
        cursor.execute("""
            SELECT id, quantity_on_hand FROM inventory_current 
            WHERE item_id = ? AND location_id = ?
        """, (item_id, supply_station_id))
        inv_record = cursor.fetchone()
        
        if inv_record:
            # Update existing inventory - ADD to current quantity
            new_qty = inv_record[1] + quantity
            cursor.execute("""
                UPDATE inventory_current 
                SET quantity_on_hand = ?, updated_at = ?
                WHERE id = ?
            """, (new_qty, now, inv_record[0]))
        else:
            # Create new inventory record
            inv_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO inventory_current (id, item_id, location_id, quantity_on_hand, 
                                              quantity_allocated, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (inv_id, item_id, supply_station_id, quantity, 0, now, now))
        
        inventory_updated += 1
        
        if items_processed % 50 == 0:
            print(f"Processed {items_processed} items...")
    
    conn.commit()
    conn.close()
    
    print(f"\n=== Import Complete ===")
    print(f"Total items processed: {items_processed}")
    print(f"New items created: {items_created}")
    print(f"Existing items updated: {items_updated}")
    print(f"Inventory records updated: {inventory_updated}")

if __name__ == "__main__":
    main()
