#!/usr/bin/env python3
"""Regenerate NSIS installer images from the Orbit brand palette."""
import os
from pathlib import Path
from PIL import Image, ImageDraw

WIN_DIR = Path(__file__).parent.parent / "packaging" / "windows"
WIN_DIR.mkdir(parents=True, exist_ok=True)

BG_DARK  = (20, 20, 20)
CIRCLE   = (45, 45, 45)
TEXT_PRI = (220, 220, 220)
TEXT_SEC = (130, 130, 130)


def header():
    img = Image.new("RGB", (150, 57), BG_DARK)
    draw = ImageDraw.Draw(img)
    r = 20
    pad = 8
    cy = (57 - r * 2) // 2
    draw.ellipse([pad, cy, pad + r * 2, cy + r * 2], fill=CIRCLE)
    draw.text((pad + r * 2 + 8, 57 // 2 - 6), "Orbit", fill=TEXT_PRI)
    out = WIN_DIR / "nsis-header.bmp"
    img.save(out)
    print(f"✓ {out.name}")


def sidebar():
    img = Image.new("RGB", (164, 314), BG_DARK)
    draw = ImageDraw.Draw(img)
    cx, cy, r = 82, 100, 55
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CIRCLE)
    draw.text((55, 168), "Orbit", fill=TEXT_PRI)
    draw.text((18, 192), "AI Dev Toolkit", fill=TEXT_SEC)
    out = WIN_DIR / "nsis-sidebar.bmp"
    img.save(out)
    print(f"✓ {out.name}")


if __name__ == "__main__":
    header()
    sidebar()
