import math
import random
import os

# Output TypeScript file
OUTPUT_TS = "src/data/mountainRidges.ts"

# Reproducible random seed
random.seed(42)

# Permutation table for Perlin noise
P = list(range(256))
random.shuffle(P)
PERM = P + P

def fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)

def lerp(t, a, b):
    return a + t * (b - a)

def grad(hash_val, x, y):
    h = hash_val & 7
    u = x if h < 4 else y
    v = y if h < 4 else x
    return (u if (h & 1) == 0 else -u) + (v if (h & 2) == 0 else -v)

def perlin2d(x, y):
    xi = int(math.floor(x)) & 255
    yi = int(math.floor(y)) & 255
    xf = x - math.floor(x)
    yf = y - math.floor(y)
    
    u = fade(xf)
    v = fade(yf)
    
    aa = PERM[PERM[xi] + yi]
    ab = PERM[PERM[xi] + yi + 1]
    ba = PERM[PERM[xi + 1] + yi]
    bb = PERM[PERM[xi + 1] + yi + 1]
    
    x1 = lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf))
    x2 = lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1))
    return (lerp(v, x1, x2) + 1.0) * 0.5

def fbm(x, y, octaves=4, lacunarity=2.0, gain=0.5):
    total = 0.0
    freq = 1.0
    amp = 1.0
    max_val = 0.0
    for _ in range(octaves):
        total += perlin2d(x * freq, y * freq) * amp
        max_val += amp
        freq *= lacunarity
        amp *= gain
    return total / max_val

def ridged_noise(x, y):
    # Ridged multifractal: sharp mountain spine ridges
    n1 = fbm(x, y, octaves=3)
    r1 = 1.0 - abs(2.0 * n1 - 1.0)
    n2 = fbm(x * 2.2 + 3.7, y * 2.2 + 1.9, octaves=2)
    r2 = 1.0 - abs(2.0 * n2 - 1.0)
    return r1 * 0.7 + r2 * 0.3

def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

def main():
    print("Generating topographic mountain needle field...")
    
    # Bounding box spanning the edges around the central subway valley
    # Map space viewBox is ~(-810, -455) to (805, 600)
    # The mountain perimeter extends from r ~ 440 out to r ~ 1500
    X_MIN, X_MAX = -1600, 1600
    Y_MIN, Y_MAX = -1200, 1200
    
    STEP_X = 20.0
    STEP_Y = 15.0
    
    dots_segments = []
    shadow_segments = []
    slope_segments = []
    crest_segments = []
    tip_dots = []
    
    # Grid sampling with subtle jitter
    ny = int((Y_MAX - Y_MIN) / STEP_Y)
    nx = int((X_MAX - X_MIN) / STEP_X)
    
    for iy in range(ny):
        base_y = Y_MIN + iy * STEP_Y
        for ix in range(nx):
            base_x = X_MIN + ix * STEP_X
            
            # Add natural jitter so needles don't look like an Excel grid
            jit_x = (random.random() - 0.5) * STEP_X * 0.75
            jit_y = (random.random() - 0.5) * STEP_Y * 0.75
            x = base_x + jit_x
            y = base_y + jit_y
            
            # Elliptical distance from center (subway basin is elongated horizontally)
            dist_center = math.hypot(x / 1.25, y / 0.85)
            
            # City basin cut: clear central metro core, mountains start at the edges (r > 320)
            if dist_center < 320:
                continue
            
            basin_mask = smoothstep(320, 560, dist_center)
            outer_mask = smoothstep(1550, 1250, dist_center)
            dist_factor = basin_mask * outer_mask
            if dist_factor < 0.02:
                continue
                
            # Domain warped coordinates for organic mountain ridge folding
            warp_scale = 0.0018
            wx = x + 180.0 * (fbm(x * warp_scale, y * warp_scale, 2) - 0.5)
            wy = y + 180.0 * (fbm(x * warp_scale + 5.2, y * warp_scale + 2.1, 2) - 0.5)
            
            # Elevation calculation
            raw_height = ridged_noise(wx * 0.0022, wy * 0.0022)
            # Power curve to produce sharper, more dramatic peaks
            height = (raw_height ** 2.2) * dist_factor
            
            if height < 0.04:
                continue
                
            # Flow field angle: combination of outward radiation + ridge contours
            angle_radial = math.atan2(y, x)
            ridge_curl = (fbm(wx * 0.0035, wy * 0.0035, 3) - 0.5) * math.pi * 1.6
            flow_angle = angle_radial * 0.45 + ridge_curl * 0.55 - math.pi * 0.25
            
            # Flow vector
            cos_a = math.cos(flow_angle)
            sin_a = math.sin(flow_angle)
            
            # Visual categorisation based on height & steepness (as in reference image)
            # 1. Low boundary: transition dot matrix
            if height < 0.16:
                # Dot stipple matrix
                dots_segments.append((round(x, 1), round(y, 1)))
                continue
                
            # 2. Needles (bristles): length scales with elevation
            # From short 6px bristles up to 34px dramatic needles on crests
            length = 5.0 + (height ** 1.3) * 32.0
            
            # Slight curvature along the needle flow
            curl_d = 0.12 * (fbm(x * 0.005, y * 0.005, 2) - 0.5)
            mid_cos = math.cos(flow_angle + curl_d)
            mid_sin = math.sin(flow_angle + curl_d)
            
            x1 = round(x, 1)
            y1 = round(y, 1)
            xm = round(x + mid_cos * length * 0.55, 1)
            ym = round(y + mid_sin * length * 0.55, 1)
            x2 = round(x + cos_a * length, 1)
            y2 = round(y + sin_a * length, 1)
            
            seg = (x1, y1, xm, ym, x2, y2)
            
            if height >= 0.58:
                # Ridge Crests: highest, brightest needles
                crest_segments.append(seg)
                # Fiber-optic specular glowing tip
                tip_dots.append((x2, y2))
            elif height >= 0.32:
                # Mid slopes: luminous cyan needles
                slope_segments.append(seg)
            else:
                # Deep valley / shadow needles
                shadow_segments.append(seg)
                
    print(f"Generated:")
    print(f"  Transition Dots: {len(dots_segments)}")
    print(f"  Shadow Needles: {len(shadow_segments)}")
    print(f"  Slope Needles: {len(slope_segments)}")
    print(f"  Crest Needles: {len(crest_segments)}")
    print(f"  Glowing Tips: {len(tip_dots)}")
    
    def lines_to_path(segs):
        parts = []
        for s in segs:
            parts.append(f"M{s[0]},{s[1]}Q{s[2]},{s[3]} {s[4]},{s[5]}")
        return "".join(parts)
        
    def dots_to_path(dots, radius=0.9):
        # Render dots as compact tiny zero-length lines with round caps: M x,y h 0.01
        # In SVG with stroke-linecap: round, this renders as a perfect crisp circular dot!
        parts = []
        for d in dots:
            parts.append(f"M{d[0]},{d[1]}h0.01")
        return "".join(parts)
        
    crest_path = lines_to_path(crest_segments)
    slope_path = lines_to_path(slope_segments)
    shadow_path = lines_to_path(shadow_segments)
    dots_path = dots_to_path(dots_segments)
    tips_path = dots_to_path(tip_dots)
    
    os.makedirs(os.path.dirname(OUTPUT_TS), exist_ok=True)
    with open(OUTPUT_TS, "w", encoding="utf-8") as f:
        f.write(f"""// Parametric Topographic Mountain Ridges (LiDAR / Fiber-Optic Needle Field)
// Inspired by Andean mountain cordilleras and high-density elevation flow fields
// Combed directional bristles, ridged mountain spines and transition stipples

export const mountainRidges = {{
  dots: "{dots_path}",
  shadows: "{shadow_path}",
  slopes: "{slope_path}",
  crests: "{crest_path}",
  tips: "{tips_path}",
}};
""")
    print(f"Generated {OUTPUT_TS} successfully ({os.path.getsize(OUTPUT_TS)} bytes)!")

if __name__ == "__main__":
    main()
