"""
Seed sample EMS items with new category system
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.item import Item
import uuid

SAMPLE_ITEMS = [
    # AIRWAY items
    {
        "item_code": "AIR-001",
        "name": "King LT Airway Size 4",
        "description": "Adult King LT supraglottic airway device",
        "category_id": "AIRWAY",
        "unit_of_measure": "EA",
        "manufacturer": "Ambu",
        "cost_per_unit": 24.50,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "AIR-002",
        "name": "ET Tube 7.5mm",
        "description": "Endotracheal tube with cuff, 7.5mm internal diameter",
        "category_id": "AIRWAY",
        "unit_of_measure": "EA",
        "manufacturer": "Medline",
        "cost_per_unit": 3.25,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "AIR-003",
        "name": "Yankauer Suction Tip",
        "description": "Rigid plastic suction catheter",
        "category_id": "AIRWAY",
        "unit_of_measure": "EA",
        "cost_per_unit": 0.85,
        "requires_expiration_tracking": False,
    },
    # BREATHING items
    {
        "item_code": "BRE-001",
        "name": "Oxygen Cylinder D-Size",
        "description": "Portable oxygen cylinder, 425L capacity",
        "category_id": "BREATHING",
        "unit_of_measure": "EA",
        "manufacturer": "Airgas",
        "cost_per_unit": 45.00,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "BRE-002",
        "name": "Non-Rebreather Mask Adult",
        "description": "High-flow oxygen mask with reservoir bag",
        "category_id": "BREATHING",
        "unit_of_measure": "EA",
        "cost_per_unit": 1.50,
        "requires_expiration_tracking": False,
    },
    # CARDIAC items
    {
        "item_code": "CAR-001",
        "name": "AED Pads Adult",
        "description": "Disposable defibrillator electrode pads",
        "category_id": "CARDIAC",
        "unit_of_measure": "SET",
        "manufacturer": "Zoll",
        "cost_per_unit": 65.00,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "CAR-002",
        "name": "EKG Electrodes",
        "description": "3-lead ECG monitoring electrodes, box of 50",
        "category_id": "CARDIAC",
        "unit_of_measure": "BOX",
        "cost_per_unit": 12.50,
        "requires_expiration_tracking": False,
    },
    # TRAUMA items
    {
        "item_code": "TRA-001",
        "name": "Trauma Shears 7.5 inch",
        "description": "Stainless steel bandage scissors",
        "category_id": "TRAUMA",
        "unit_of_measure": "EA",
        "cost_per_unit": 4.25,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "TRA-002",
        "name": "Israeli Bandage 4 inch",
        "description": "Compression emergency bandage",
        "category_id": "TRAUMA",
        "unit_of_measure": "EA",
        "manufacturer": "First Care",
        "cost_per_unit": 8.75,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "TRA-003",
        "name": "C-Collar Adult Adjustable",
        "description": "Cervical spine immobilization collar",
        "category_id": "TRAUMA",
        "unit_of_measure": "EA",
        "manufacturer": "Laerdal",
        "cost_per_unit": 18.50,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "TRA-004",
        "name": "Combat Gauze",
        "description": "Hemostatic gauze for severe bleeding",
        "category_id": "TRAUMA",
        "unit_of_measure": "EA",
        "manufacturer": "QuikClot",
        "cost_per_unit": 42.00,
        "requires_expiration_tracking": True,
    },
    # IV_FLUIDS items
    {
        "item_code": "IV-001",
        "name": "Normal Saline 1000mL",
        "description": "0.9% sodium chloride IV bag",
        "category_id": "IV_FLUIDS",
        "unit_of_measure": "BAG",
        "manufacturer": "Baxter",
        "cost_per_unit": 3.50,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "IV-002",
        "name": "IV Catheter 18ga",
        "description": "Peripheral IV catheter, 18 gauge",
        "category_id": "IV_FLUIDS",
        "unit_of_measure": "EA",
        "manufacturer": "BD",
        "cost_per_unit": 2.25,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "IV-003",
        "name": "Macro Drip IV Set",
        "description": "10 drops/mL IV administration set",
        "category_id": "IV_FLUIDS",
        "unit_of_measure": "EA",
        "cost_per_unit": 1.75,
        "requires_expiration_tracking": True,
    },
    # MEDICATIONS items
    {
        "item_code": "MED-001",
        "name": "Epinephrine 1:10,000 10mL",
        "description": "Pre-filled cardiac emergency syringe",
        "category_id": "MEDICATIONS",
        "unit_of_measure": "EA",
        "manufacturer": "Hospira",
        "cost_per_unit": 18.50,
        "requires_expiration_tracking": True,
        "is_controlled_substance": False,
    },
    {
        "item_code": "MED-002",
        "name": "Aspirin 81mg Chewable",
        "description": "Baby aspirin for cardiac patients, bottle of 100",
        "category_id": "MEDICATIONS",
        "unit_of_measure": "BOTTLE",
        "cost_per_unit": 4.50,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "MED-003",
        "name": "Narcan 4mg Nasal Spray",
        "description": "Naloxone HCl nasal spray for opioid overdose",
        "category_id": "MEDICATIONS",
        "unit_of_measure": "EA",
        "manufacturer": "Emergent BioSolutions",
        "cost_per_unit": 125.00,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "MED-004",
        "name": "Morphine Sulfate 10mg",
        "description": "Narcotic analgesic pre-filled syringe",
        "category_id": "MEDICATIONS",
        "unit_of_measure": "EA",
        "cost_per_unit": 12.00,
        "requires_expiration_tracking": True,
        "is_controlled_substance": True,
    },
    # DIAGNOSTIC items
    {
        "item_code": "DIA-001",
        "name": "Blood Pressure Cuff Adult",
        "description": "Disposable BP cuff for non-invasive monitoring",
        "category_id": "DIAGNOSTIC",
        "unit_of_measure": "EA",
        "cost_per_unit": 3.25,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "DIA-002",
        "name": "Glucometer Test Strips",
        "description": "Blood glucose test strips, box of 50",
        "category_id": "DIAGNOSTIC",
        "unit_of_measure": "BOX",
        "manufacturer": "Roche",
        "cost_per_unit": 28.50,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "DIA-003",
        "name": "Pulse Oximeter Probe",
        "description": "Reusable SpO2 sensor probe",
        "category_id": "DIAGNOSTIC",
        "unit_of_measure": "EA",
        "cost_per_unit": 85.00,
        "requires_expiration_tracking": False,
    },
    # INFECTION_CONTROL items
    {
        "item_code": "INF-001",
        "name": "Nitrile Gloves Large",
        "description": "Powder-free exam gloves, box of 100",
        "category_id": "INFECTION_CONTROL",
        "unit_of_measure": "BOX",
        "manufacturer": "Medline",
        "cost_per_unit": 8.50,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "INF-002",
        "name": "N95 Respirator Mask",
        "description": "NIOSH-approved particulate respirator",
        "category_id": "INFECTION_CONTROL",
        "unit_of_measure": "EA",
        "manufacturer": "3M",
        "cost_per_unit": 2.25,
        "requires_expiration_tracking": True,
    },
    {
        "item_code": "INF-003",
        "name": "Hand Sanitizer 8oz",
        "description": "70% ethyl alcohol gel sanitizer",
        "category_id": "INFECTION_CONTROL",
        "unit_of_measure": "BOTTLE",
        "cost_per_unit": 3.50,
        "requires_expiration_tracking": True,
    },
    # PEDIATRIC items
    {
        "item_code": "PED-001",
        "name": "Pediatric BP Cuff",
        "description": "Blood pressure cuff for children",
        "category_id": "PEDIATRIC",
        "unit_of_measure": "EA",
        "cost_per_unit": 4.25,
        "requires_expiration_tracking": False,
    },
    {
        "item_code": "PED-002",
        "name": "Broselow Tape",
        "description": "Pediatric emergency reference tape",
        "category_id": "PEDIATRIC",
        "unit_of_measure": "EA",
        "cost_per_unit": 12.50,
        "requires_expiration_tracking": False,
    },
]

db = SessionLocal()
try:
    print(f"\n🌱 Seeding {len(SAMPLE_ITEMS)} sample items...")
    
    for item_data in SAMPLE_ITEMS:
        item = Item(
            id=uuid.uuid4(),
            is_active=True,
            **item_data
        )
        db.add(item)
    
    db.commit()
    print(f"✅ Successfully created {len(SAMPLE_ITEMS)} sample items")
    
    # Show summary by category
    print("\n📊 Items by Category:")
    from app.models.item import Category
    categories = db.query(Category).all()
    for cat in categories:
        count = db.query(Item).filter(Item.category_id == cat.id).count()
        if count > 0:
            print(f"   {cat.name:30} ({cat.id:20}): {count} items")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    db.rollback()
    raise
finally:
    db.close()

print("\n✨ Sample items loaded successfully!")
