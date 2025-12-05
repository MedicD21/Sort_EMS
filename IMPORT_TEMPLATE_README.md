# CSV Import Template Guide

## Overview

This template allows you to bulk import items with their inventory and par levels into the EMS Supply Tracking System.

## Template Fields

### Required Fields

- **item_code**: Unique identifier for the item (e.g., ITEM001)
- **name**: Item name
- **unit_of_measure**: Unit type (EA, Box, Roll, Case, etc.)

### Item Details (Optional)

- **description**: Detailed item description
- **category_id**: Category ID (MEDICAL, TRAUMA, AIRWAY, CARDIAC, IV, BANDAGES, MEDICATIONS, EQUIPMENT, CONSUMABLES, OTHER)
- **requires_expiration_tracking**: TRUE or FALSE
- **is_controlled_substance**: TRUE or FALSE
- **manufacturer**: Manufacturer name
- **manufacturer_part_number**: Manufacturer's part number
- **cost_per_unit**: Cost per unit (decimal number, e.g., 25.50)
- **is_active**: TRUE or FALSE (defaults to TRUE)

### Supplier Information (Optional)

- **supplier_name**: Supplier/vendor name
- **supplier_contact**: Contact person at supplier
- **supplier_email**: Supplier email address
- **supplier_phone**: Supplier phone number
- **supplier_website**: Supplier website URL
- **supplier_account_number**: Your account number with supplier

### Ordering Information (Optional)

- **minimum_order_quantity**: Minimum quantity to order
- **order_unit**: Unit for ordering (Box, Case, etc.)
- **lead_time_days**: Number of days for delivery
- **preferred_vendor**: Preferred vendor name
- **alternate_vendor**: Alternate vendor name

### Stock Levels (Optional, per location)

- **location_name**: Location name (e.g., "Cabinet 1", "Truck A", "Station Storage")
- **current_stock**: Current quantity on hand
- **par_level**: Target stock level (par quantity)
- **reorder_level**: Minimum level before reordering (reorder quantity)
- **max_quantity**: Maximum stock level (optional)

## Boolean Values

- Use `TRUE` or `FALSE` (case-insensitive)
- Or use `1` for TRUE, `0` for FALSE

## Categories

Valid category IDs:

- MEDICAL
- TRAUMA
- AIRWAY
- CARDIAC
- IV
- BANDAGES
- MEDICATIONS
- EQUIPMENT
- CONSUMABLES
- OTHER

## Notes

1. **Item Code**: Must be unique across all items
2. **Location-based fields**: If you specify location_name, the system will:
   - Create inventory records for current_stock
   - Create par level records for par_level, reorder_level, max_quantity
3. **Multiple locations per item**: Create multiple rows with the same item_code but different location_name
4. **Empty fields**: Leave cells empty if data is not available (don't use NULL or N/A)
5. **Decimal numbers**: Use period (.) as decimal separator (e.g., 25.50)
6. **Quotes**: Use double quotes around values containing commas

## Example Usage

### Single Item, No Location Data

```csv
item_code,name,unit_of_measure,category_id,manufacturer,cost_per_unit
GAUZE001,4x4 Gauze Pads,Box,BANDAGES,MedSupply Co,12.50
```

### Item with Location-Specific Stock

```csv
item_code,name,unit_of_measure,location_name,current_stock,par_level,reorder_level
GAUZE001,4x4 Gauze Pads,Box,Cabinet 1,50,100,25
GAUZE001,4x4 Gauze Pads,Box,Truck A,20,30,10
```

### Complete Item with All Fields

```csv
item_code,name,description,category_id,unit_of_measure,requires_expiration_tracking,manufacturer,cost_per_unit,supplier_name,supplier_phone,location_name,current_stock,par_level,reorder_level
EPI001,Epinephrine 1:1000,"Epinephrine injection for anaphylaxis",MEDICATIONS,EA,TRUE,Pfizer,45.00,MedWholesale,555-1234,Cabinet 1,10,20,5
```

## Import Process

(Note: CSV import functionality needs to be implemented in the system)

The import will:

1. Create or update item master records
2. Link items to categories
3. Create inventory records for locations
4. Set up par levels for locations
5. Validate all data before committing

## Validation Rules

- Item codes must be unique
- Categories must exist in the system
- Locations will be matched by name
- Boolean fields accept: TRUE/FALSE, true/false, 1/0
- Numeric fields must be valid numbers
- Cost and quantities must be >= 0
