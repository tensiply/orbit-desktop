#!/usr/bin/env python3
"""Regenerate all icon sizes from assets/orbit-logo.svg.

Usage:
    python3 scripts/gen-icons.py           # regenerate all
    python3 scripts/gen-icons.py --check   # verify sizes are correct
"""
import os, sys, subprocess, argparse
from pathlib import Path

ROOT = Path(__file__).parent.parent
ICONS_DIR = ROOT / "src-tauri" / "icons"
SVG_SOURCE = ROOT / "assets" / "orbit-logo.svg"


def svg_to_png(svg_path: Path, out_path: Path, size: int):
    try:
        import cairosvg
        cairosvg.svg2png(url=str(svg_path), write_to=str(out_path), output_width=size, output_height=size)
        return True
    except ImportError:
        pass
    result = subprocess.run(
        ["inkscape", "--export-type=png", f"--export-filename={out_path}",
         f"--export-width={size}", f"--export-height={size}", str(svg_path)],
        capture_output=True,
    )
    if result.returncode == 0:
        return True
    result2 = subprocess.run(
        ["convert", "-background", "none", "-resize", f"{size}x{size}", str(svg_path), str(out_path)],
        capture_output=True,
    )
    return result2.returncode == 0


def generate():
    from PIL import Image, ImageDraw

    ICONS_DIR.mkdir(parents=True, exist_ok=True)

    if SVG_SOURCE.exists():
        ok = svg_to_png(SVG_SOURCE, ICONS_DIR / "icon.png", 1024)
        if ok:
            print(f"✓ icon.png from SVG")
        else:
            print("⚠ SVG conversion failed — using PIL fallback")

    if not (ICONS_DIR / "icon.png").exists() or (ICONS_DIR / "icon.png").stat().st_size < 1000:
        _gen_circle_png(ICONS_DIR / "icon.png", 1024)

    base = Image.open(ICONS_DIR / "icon.png").convert("RGBA")

    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "256x256.png": 256,
        "512x512.png": 512,
    }
    for name, size in sizes.items():
        out = ICONS_DIR / name
        resized = base.resize((size, size), Image.LANCZOS)
        resized.save(out)
        print(f"✓ {name}")

    subprocess.run([
        "convert",
        str(ICONS_DIR / "32x32.png"),
        str(ICONS_DIR / "128x128.png"),
        str(ICONS_DIR / "256x256.png"),
        str(ICONS_DIR / "icon.ico"),
    ], check=True)
    print("✓ icon.ico")

    subprocess.run([
        "convert",
        str(ICONS_DIR / "32x32.png"),
        str(ICONS_DIR / "128x128.png"),
        str(ICONS_DIR / "256x256.png"),
        str(ICONS_DIR / "512x512.png"),
        str(ICONS_DIR / "icon.png"),
        str(ICONS_DIR / "icon.icns"),
    ], check=True)
    print("✓ icon.icns")


def _gen_circle_png(out: Path, size: int):
    from PIL import Image, ImageDraw
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.08)
    draw.ellipse([pad, pad, size - pad - 1, size - pad - 1], fill=(45, 45, 45, 255))
    img.save(out)


def check():
    expected = ["32x32.png", "128x128.png", "128x128@2x.png", "256x256.png", "512x512.png", "icon.ico", "icon.icns", "icon.png"]
    ok = True
    for name in expected:
        p = ICONS_DIR / name
        if p.exists():
            print(f"  ✓ {name} ({p.stat().st_size} bytes)")
        else:
            print(f"  ✗ {name} MISSING")
            ok = False
    return ok


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    if args.check:
        sys.exit(0 if check() else 1)
    else:
        generate()
