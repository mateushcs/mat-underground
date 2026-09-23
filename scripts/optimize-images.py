"""Convert the site's referenced PNG/JPG images to WebP and move unreferenced ones
out of public/ (into assets-src/, never deleted) so they are not deployed.

Run from the project root:  python scripts/optimize-images.py [--dry]
Rewrites image paths in src/ (.png/.jpg -> .webp) for every converted file.
"""
import pathlib
import re
import shutil
import sys

from PIL import Image

DRY = "--dry" in sys.argv
ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SRC = ROOT / "src"
ARCHIVE = ROOT / "assets-src" / "public"
MAX_WIDTH = 2400
QUALITY = 82
# Posters are addressed by slug (lib/posters.ts), not by literal path.
POSTER_SLUGS = {"sobre-mim", "uptime-center", "solv", "terapio", "musicas", "tour-house", "creditos", "contato"}

sources = [p for p in SRC.rglob("*") if p.suffix in {".ts", ".tsx", ".css"} and "osmBlueprint" not in p.name]
code = {p: p.read_text(encoding="utf-8") for p in sources}
all_code = "\n".join(code.values())


def referenced(rel: str) -> bool:
    if rel in all_code or f'"{pathlib.PurePosixPath(rel).name}"' in all_code:
        return True
    parts = pathlib.PurePosixPath(rel)
    return parts.parent.as_posix() == "/stations/posters" and parts.stem in POSTER_SLUGS


converted, archived, saved = [], [], 0
for img in sorted(PUBLIC.rglob("*")):
    if img.suffix.lower() not in {".png", ".jpg", ".jpeg"} or not img.is_file():
        continue
    rel = "/" + img.relative_to(PUBLIC).as_posix()
    if not referenced(rel):
        archived.append(rel)
        if not DRY:
            dest = ARCHIVE / img.relative_to(PUBLIC)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(img), dest)
        continue
    out = img.with_suffix(".webp")
    before = img.stat().st_size
    if not DRY:
        with Image.open(img) as im:
            im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
            if im.width > MAX_WIDTH:
                im = im.resize((MAX_WIDTH, round(im.height * MAX_WIDTH / im.width)), Image.LANCZOS)
            im.save(out, "WEBP", quality=QUALITY, method=6)
        after = out.stat().st_size
        saved += before - after
        dest = ARCHIVE / img.relative_to(PUBLIC)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(img), dest)
    converted.append(rel)

# Point the code at the WebP files.
if not DRY:
    for path, text in code.items():
        new = text
        for rel in converted:
            webp = re.sub(r"\.(png|jpe?g)$", ".webp", rel)
            new = new.replace(rel, webp)
            name = pathlib.PurePosixPath(rel).name
            new = new.replace(f'"{name}"', f'"{pathlib.PurePosixPath(webp).name}"')
        if new != text:
            path.write_text(new, encoding="utf-8")

print(f"converted {len(converted)}, archived {len(archived)}, saved {saved / 1e6:.1f} MB")
for rel in archived:
    print("  archived", rel)
