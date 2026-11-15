#!/usr/bin/env python3
"""Build size-appropriate product and campaign thumbnails without modifying originals.

This script is run in GitHub Actions; generated WebPs are committed so Render
and the live store don't need image-processing dependencies.
"""
from pathlib import Path
from PIL import Image
import sys

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"public/assets"
JOBS=[
    ("mvn-owner-landscape-banner.webp","mvn-owner-landscape-banner-mobile.webp",960,82),
    ("mvn-hero-creatine-cutout.png","mvn-hero-creatine-cutout-card.webp",420,85),
    ("mvn-hero-whey-cutout.png","mvn-hero-whey-cutout-card.webp",420,85),
    ("mvn-hero-nitro-cutout.png","mvn-hero-nitro-cutout-card.webp",420,85),
    ("pro-creatine.png","pro-creatine-card.webp",540,85),
    ("sturdy-watermelon-front.webp","sturdy-watermelon-front-card.webp",540,85),
    ("IMG-20261102-WA0019.jpg","IMG-20261102-WA0019-card.webp",768,91),
]
for source,target,width,quality in JOBS:
    source_path=ASSETS/source
    if not source_path.is_file():
        raise FileNotFoundError(f"Original photo missing: {source_path}")
    with Image.open(source_path) as opened:
        opened.load()
        im=opened.convert("RGBA" if "A" in opened.getbands() else "RGB")
        new_height=round(im.height*width/im.width)
        if width>=im.width:
            raise ValueError(f"Refusing to upscale original: {source}")
        im=im.resize((width,new_height),Image.Resampling.LANCZOS)
        target_path=ASSETS/target
        im.save(target_path,format="WEBP",quality=quality,method=6,exact=True)
        original_size=source_path.stat().st_size
        new_size=target_path.stat().st_size
        if new_size>=original_size:
            raise ValueError(f"Optimization failed for {source}: {original_size} -> {new_size}")
        print(f"{source} -> {target}: {original_size:,} -> {new_size:,} bytes ({new_size/original_size:.0%}), {width}x{new_height}")
