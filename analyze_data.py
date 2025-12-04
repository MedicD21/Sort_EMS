import pandas as pd
import json

# Load the Excel file
file_path = r'c:\Users\DScha\OneDrive\Desktop\Sort_EMS\Medic 4 supply closet 71625.xlsx'
df = pd.read_excel(file_path, sheet_name=None)  # Load all sheets

# Display sheet names
print("Sheet names:", list(df.keys()))
print("\n" + "="*80 + "\n")

# Analyze each sheet
for sheet_name, data in df.items():
    print(f"SHEET: {sheet_name}")
    print(f"Shape: {data.shape} (rows, columns)")
    print(f"\nColumns: {list(data.columns)}")
    print(f"\nFirst few rows:")
    print(data.head(10))
    print("\n" + "="*80 + "\n")
