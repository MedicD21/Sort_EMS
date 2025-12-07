import urllib.request
import json

url = "http://localhost:8000/api/v1/inventory/current?location_id=440b02a6-f55e-4a12-9a18-4677694e8ce5&limit=500"
response = urllib.request.urlopen(url)
d = json.loads(response.read())

print(f"Total items: {len(d)}")
if d:
    print(f"First item location: {d[0].get('location_name')}")
    print(f"Total qty: {sum(i['quantity_on_hand'] for i in d)}")
    print(f"\nSample items:")
    for item in d[:5]:
        print(f"  - {item['item_name']}: {item['quantity_on_hand']}")
