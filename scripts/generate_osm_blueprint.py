import os
import math
import requests
import xml.etree.ElementTree as ET

CACHE_FILE = "scripts/sucre_osm.xml"
OUTPUT_TS = "src/data/osmBlueprint.ts"

# Sucre coordinates covering the central colonial grid + surrounding organic hills
# bbox=min_lon,min_lat,max_lon,max_lat
# Center is approx (-65.2595, -19.0478)
BBOX = "-65.286,-19.072,-65.234,-19.022"
CENTER_LON = -65.2595
CENTER_LAT = -19.0478

def fetch_osm_data():
    if os.path.exists(CACHE_FILE) and os.path.getsize(CACHE_FILE) > 500000:
        print(f"Loading cached OSM data from {CACHE_FILE}...")
        with open(CACHE_FILE, "rb") as f:
            return f.read()
    
    url = f"https://api.openstreetmap.org/api/0.6/map?bbox={BBOX}"
    print(f"Downloading OpenStreetMap data from {url}...")
    headers = {"User-Agent": "MatUndergroundClubPortfolio/2.0 (author: mateushcs)"}
    resp = requests.get(url, headers=headers, timeout=60)
    if resp.status_code != 200:
        raise Exception(f"Failed to download OSM data: {resp.status_code}\n{resp.text[:300]}")
    
    with open(CACHE_FILE, "wb") as f:
        f.write(resp.content)
    print(f"Saved {len(resp.content)} bytes to {CACHE_FILE}")
    return resp.content

def douglas_peucker(points, tolerance):
    if len(points) <= 2:
        return points
    
    p1 = points[0]
    p2 = points[-1]
    
    max_dist = 0.0
    index = 0
    
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    line_len_sq = dx * dx + dy * dy
    
    for i in range(1, len(points) - 1):
        p = points[i]
        if line_len_sq == 0:
            dist = math.hypot(p[0] - p1[0], p[1] - p1[1])
        else:
            u = ((p[0] - p1[0]) * dx + (p[1] - p1[1]) * dy) / line_len_sq
            u = max(0.0, min(1.0, u))
            proj_x = p1[0] + u * dx
            proj_y = p1[1] + u * dy
            dist = math.hypot(p[0] - proj_x, p[1] - proj_y)
        
        if dist > max_dist:
            max_dist = dist
            index = i
            
    if max_dist > tolerance:
        left = douglas_peucker(points[:index + 1], tolerance)
        right = douglas_peucker(points[index:], tolerance)
        return left[:-1] + right
    else:
        return [p1, p2]

def chaikin_smooth(points, iterations=1):
    """Chaikin's corner cutting algorithm for organic fluid curves"""
    if len(points) <= 2:
        return points
    for _ in range(iterations):
        smoothed = [points[0]]
        for i in range(len(points) - 1):
            p0 = points[i]
            p1 = points[i + 1]
            q = (0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1])
            r = (0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1])
            smoothed.extend([q, r])
        smoothed.append(points[-1])
        points = smoothed
    return points

def main():
    content = fetch_osm_data()
    print("Parsing OSM XML...")
    root = ET.fromstring(content)
    
    # 1. Parse Nodes
    nodes = {}
    for node in root.findall("node"):
        nid = node.attrib["id"]
        lat = float(node.attrib["lat"])
        lon = float(node.attrib["lon"])
        nodes[nid] = (lon, lat)
    print(f"Parsed {len(nodes)} nodes.")
    
    # Map space projection
    # Centered around (0, 0) in SVG coordinates (-750 to 750, -450 to 450)
    # 1 deg lon at lat -19° is approx 105 km; 1 deg lat is 111 km.
    # Aspect ratio correction cos(lat):
    cos_lat = math.cos(math.radians(CENTER_LAT))
    
    # Target visual scale:
    # Bbox spans ~0.05 deg lon -> approx 5 km.
    # Map board width is ~1400 units -> SCALE approx 26000
    SCALE = 27500.0
    
    def project(lon, lat):
        x = (lon - CENTER_LON) * cos_lat * SCALE
        # Invert y because latitude increases upwards, while SVG Y increases downwards
        y = -(lat - CENTER_LAT) * SCALE
        return (round(x, 1), round(y, 1))
    
    # Full-screen framing (spans across the entire board from edge to edge)
    CLIP_RADIUS = 1350.0
    CLIP_RADIUS_SQ = CLIP_RADIUS * CLIP_RADIUS
    
    categories = {
        "primary": [],
        "secondary": [],
        "residential": [],
        "service": [],
        "water": []
    }
    
    primary_types = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"}
    secondary_types = {"secondary", "secondary_link", "tertiary", "tertiary_link"}
    residential_types = {"residential", "unclassified"}
    service_types = {"service", "pedestrian", "footway", "path", "living_street", "steps"}
    
    for way in root.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
        hw = tags.get("highway")
        water = tags.get("waterway")
        
        target_cat = None
        if water in {"river", "stream", "canal", "drain"}:
            target_cat = "water"
        elif hw in primary_types:
            target_cat = "primary"
        elif hw in secondary_types:
            target_cat = "secondary"
        elif hw in residential_types:
            target_cat = "residential"
        elif hw in service_types:
            target_cat = "service"
            
        if not target_cat:
            continue
            
        nd_refs = [nd.attrib["ref"] for nd in way.findall("nd")]
        pts = [nodes[ref] for ref in nd_refs if ref in nodes]
        if len(pts) < 2:
            continue
            
        # Project points to SVG coordinate space
        proj_pts = [project(p[0], p[1]) for p in pts]
        
        # Check if segment is within map reach
        in_frame = any(p[0]*p[0] + p[1]*p[1] <= CLIP_RADIUS_SQ for p in proj_pts)
        if not in_frame:
            continue
            
        # Douglas-Peucker simplification: tolerance depends on category.
        # Faint layers (residential/service/water) get a much higher tolerance and
        # skip the extra Chaikin points. Keeps the blueprint vector/crisp at every
        # zoom level while cutting the geometry re-rasterised on each pan/zoom.
        tol = {
            "primary": 2.0,
            "secondary": 3.0,
            "residential": 5.0,
            "service": 6.0,
            "water": 3.5,
        }.get(target_cat, 3.0)
        simplified = douglas_peucker(proj_pts, tol)

        # Chaikin smoothing only where the organic curve actually reads.
        if len(simplified) >= 3 and target_cat in {"secondary", "water"}:
            smoothed = chaikin_smooth(simplified, iterations=1)
        else:
            smoothed = simplified
            
        categories[target_cat].append(smoothed)
    
    print("Geometry processed:")
    for k, v in categories.items():
        print(f"  {k}: {len(v)} ways")
        
    def to_svg_path(lines):
        path_segments = []
        for line in lines:
            if not line:
                continue
            seg = f"M{line[0][0]},{line[0][1]}" + "".join(f"L{p[0]},{p[1]}" for p in line[1:])
            path_segments.append(seg)
        return "".join(path_segments)
        
    primary_path = to_svg_path(categories["primary"])
    secondary_path = to_svg_path(categories["secondary"])
    residential_path = to_svg_path(categories["residential"])
    service_path = to_svg_path(categories["service"])
    water_path = to_svg_path(categories["water"])
    
    os.makedirs(os.path.dirname(OUTPUT_TS), exist_ok=True)
    with open(OUTPUT_TS, "w", encoding="utf-8") as f:
        f.write(f"""// OpenStreetMap Road Network Vector Data for Blueprint Background
// Extracted and simplified from real OpenStreetMap data of Sucre, Bolivia
// Contains authentic colonial grid and organic hillside topography

export const osmBlueprint = {{
  clipRadius: {CLIP_RADIUS},
  primary: "{primary_path}",
  secondary: "{secondary_path}",
  residential: "{residential_path}",
  service: "{service_path}",
  water: "{water_path}",
}};
""")
    print(f"Generated {OUTPUT_TS} successfully ({os.path.getsize(OUTPUT_TS)} bytes)!")

if __name__ == "__main__":
    main()
