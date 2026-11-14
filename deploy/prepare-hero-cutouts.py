#!/usr/bin/env python3
"""Derive transparent e-commerce hero cutouts from the ORIGINAL MVN photos.

No synthetic pack artwork, text retouching, or enhancement. The foreground mask
only removes the connected source-photo background; product pixels are copied.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSET = ROOT / "public" / "assets"
PRODUCTS = {
    "potency-whey-coffee-5lb.webp": "mvn-hero-whey-cutout.png",
    "nitro-mass-3kg-double-rich-chocolate.webp": "mvn-hero-nitro-cutout.png",
    "pro-creatine.png": "mvn-hero-creatine-cutout.png",
}

def cut_product(source: Path, dest: Path):
    rgba = Image.open(source).convert("RGBA")
    # Resize only for segmentation, using exact original RGB for final output.
    rgb = np.asarray(rgba.convert("RGB"))
    height, width = rgb.shape[:2]
    scale = min(1.0, 950 / max(height, width))
    work = cv2.resize(rgb, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA) if scale < 1 else rgb
    h, w = work.shape[:2]
    bgr = cv2.cvtColor(work, cv2.COLOR_RGB2BGR)
    orig_alpha = np.asarray(rgba.getchannel("A"))
    # Background seeds: frame perimeter and bright desaturated corners.
    mask = np.full((h, w), cv2.GC_PR_FGD, dtype=np.uint8)
    rim = max(5, round(min(h, w) * .035))
    mask[:rim, :] = cv2.GC_BGD
    mask[-rim:, :] = cv2.GC_BGD
    mask[:, :rim] = cv2.GC_BGD
    mask[:, -rim:] = cv2.GC_BGD
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    corner = np.vstack([lab[:rim, :rim].reshape(-1,3),lab[:rim, -rim:].reshape(-1,3),
        lab[-rim:, :rim].reshape(-1,3),lab[-rim:, -rim:].reshape(-1,3)])
    background_color = np.median(corner.astype(np.float32), axis=0)
    dist = np.linalg.norm(lab.astype(np.float32) - background_color, axis=2)
    # A pale studio backdrop is probable background, but never force interior
    # white label/bucket sections to background before contour filling.
    mask[dist < 18] = cv2.GC_PR_BGD
    # Strong colored typography and product lid must be protected as foreground.
    core = (np.arange(h)[:,None] > rim*2) & (np.arange(h)[:,None] < h-rim*2) & (np.arange(w)[None,:] > rim*2) & (np.arange(w)[None,:] < w-rim*2)
    mask[core & (dist > 56)] = cv2.GC_FGD
    # Guarantee background corner frame regardless of source colors.
    mask[:rim, :] = cv2.GC_BGD
    mask[-rim:, :] = cv2.GC_BGD
    mask[:, :rim] = cv2.GC_BGD
    mask[:, -rim:] = cv2.GC_BGD
    bmodel = np.zeros((1,65),np.float64)
    fmodel = np.zeros((1,65),np.float64)
    cv2.grabCut(bgr,mask,None,bmodel,fmodel,6,cv2.GC_INIT_WITH_MASK)
    seg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # The outer product silhouette must be solid, retaining white packaging.
    contours, _ = cv2.findContours(seg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    central = [c for c in contours if cv2.contourArea(c) > h*w*.005]
    if not central: raise RuntimeError(f"No product contour: {source.name}")
    central = sorted(central,key=lambda c:cv2.contourArea(c),reverse=True)[:3]
    filled = np.zeros_like(seg)
    cv2.drawContours(filled,central,-1,255,cv2.FILLED)
    # Remove corner reflections, soften only the alpha edge (not product pixels).
    filled = cv2.morphologyEx(filled,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    alpha = cv2.GaussianBlur(filled,(5,5),.95)
    if scale < 1: alpha = cv2.resize(alpha,(width,height),interpolation=cv2.INTER_LINEAR)
    alpha = np.minimum(alpha,orig_alpha)
    fg_area = np.count_nonzero(alpha > 100) / alpha.size
    if not (.08 < fg_area < .85):
        raise RuntimeError(f"Suspicious alpha silhouette for {source.name}: {fg_area:.2%}")
    result = np.dstack([rgb,alpha]).astype(np.uint8)
    Image.fromarray(result,"RGBA").save(dest,optimize=True)
    print(f"{source.name} -> {dest.name}: {width}x{height}, foreground {fg_area:.1%}")

if __name__ == "__main__":
    for source_name,dest_name in PRODUCTS.items():
        cut_product(ASSET/source_name,ASSET/dest_name)
