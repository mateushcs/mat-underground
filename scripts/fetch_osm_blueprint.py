import requests
import json
import math

# Query Overpass API for a real city street network
# Example: Central Sucre (Reference 2) or Cali (Reference 3)
# Sucre bbox: approx around (-19.05, -65.28, -19.02, -65.24)
BBOX = "-19.06,-65.28,-19.02,-65.23"

query = f"""
[out:json][timeout:30];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential)$"]({BBOX});
  way["waterway"~"^(river|stream|canal)$"]({BBOX});
);
out geom;
"""

print("Querying Overpass API...")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "application/json"
}
headers = {"User-Agent": "MatSubwayMapBlueprintTool/1.0 (mateushcs; portfolio development)"}
resp = requests.post("https://overpass.kumi.systems/api/interpreter", data=query, headers=headers, timeout=35)
print(f"Status code: {resp.status_code}")
if resp.status_code != 200:
    print(resp.text[:400])
    exit(1)
data = resp.json()
elements = data.get("elements", [])
print(f"Fetched {len(elements)} elements from OpenStreetMap!")

ways_by_type = {"primary": [], "secondary": [], "residential": [], "water": []}

min_lat, max_lat = 90.0, -90.0
min_lon, max_lon = 180.0, -180.0

for el in elements:
    if "geometry" not in el:
        continue
    pts = el["geometry"]
    for p in pts:
        lat, lon = p["lat"], p["lon"]
        min_lat = min(min_lat, lat)
        max_lat = max(max_lat, lat)
        min_lon = min(min_lon, lon)
        max_lon = max(max_lon, lon)

print(f"Bounding box: lat [{min_lat:.4f}, {max_lat:.4f}], lon [{min_lon:.4f}, {max_lon:.4f}]")
