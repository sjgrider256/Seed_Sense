"""Prepare a web-renderable orthomosaic overlay for the Seed_Sense map viewer.

This is a STANDALONE utility, separate from the detection pipeline. It does not
modify Run_all.py, the notebooks, or requirements.txt. It only reads the source
GeoTIFF and writes two small artifacts the frontend can display:

    Data/Output/ortho.png          downsampled RGB image, reprojected to WGS84
    Data/Output/ortho_bounds.json  Leaflet LatLngBounds for the image

The frontend draws the PNG with a Leaflet ImageOverlay using those bounds. The
image is warped to EPSG:4326 so it lines up with the (also-WGS84) GeoJSON layers.

Usage:
    python tools/prepare_ortho.py [path/to/ortho.tif] [--max-dim 4096]

If no path is given, the first .tif in Data/Geotiffs/ is used (matching the
pipeline's convention).
"""

import argparse
import json
import os
import sys

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEOTIFF_DIR = os.path.join(REPO_ROOT, "Data", "Geotiffs")
OUTPUT_DIR = os.path.join(REPO_ROOT, "Data", "Output")
DST_CRS = "EPSG:4326"


def find_source_tif(explicit_path):
    if explicit_path:
        if not os.path.exists(explicit_path):
            sys.exit(f"ERROR: source not found: {explicit_path}")
        return explicit_path
    tifs = [f for f in os.listdir(GEOTIFF_DIR) if f.lower().endswith(".tif")]
    if not tifs:
        sys.exit(f"ERROR: no .tif found in {GEOTIFF_DIR}")
    return os.path.join(GEOTIFF_DIR, sorted(tifs)[0])


def percentile_stretch(band, valid, low=2, high=98):
    """Scale a float band to 0-255 uint8 using percentile clipping."""
    if valid.sum() == 0:
        return np.zeros(band.shape, dtype=np.uint8)
    lo, hi = np.percentile(band[valid], [low, high])
    if hi <= lo:
        hi = lo + 1
    out = np.clip((band - lo) / (hi - lo), 0, 1) * 255
    # nodata pixels are NaN here; zero them (they are alpha-masked anyway) so
    # the uint8 cast is well-defined.
    return np.nan_to_num(out).astype(np.uint8)


def vegetation_colormap(norm):
    """Map normalized 0-1 values to an NDVI-style brown -> yellow -> green ramp."""
    stops = np.array([0.0, 0.5, 1.0])
    reds = np.array([120, 230, 30])
    greens = np.array([80, 230, 140])
    blues = np.array([40, 120, 30])
    r = np.interp(norm, stops, reds)
    g = np.interp(norm, stops, greens)
    b = np.interp(norm, stops, blues)
    return np.dstack([r, g, b]).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser(description="Build a web ortho overlay.")
    parser.add_argument("source", nargs="?", default=None, help="path to ortho .tif")
    parser.add_argument(
        "--max-dim",
        type=int,
        default=4096,
        help="max output width/height in pixels (default 4096)",
    )
    args = parser.parse_args()

    source = find_source_tif(args.source)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Reading: {source}")

    with rasterio.open(source) as src:
        # Bounds of the source reprojected to WGS84.
        west, south, east, north = transform_bounds(src.crs, DST_CRS, *src.bounds)

        # Target grid in WGS84, downsampled so the longest side <= max-dim.
        full_w, full_h = src.width, src.height
        scale = min(1.0, args.max_dim / max(full_w, full_h))
        dst_w = max(1, int(round(full_w * scale)))
        dst_h = max(1, int(round(full_h * scale)))
        dst_transform = from_bounds(west, south, east, north, dst_w, dst_h)
        print(f"Source {full_w}x{full_h} -> overlay {dst_w}x{dst_h} (EPSG:4326)")

        band_count = src.count
        src_nodata = src.nodata
        fill = np.nan

        def warp_band(idx):
            dst = np.full((dst_h, dst_w), fill, dtype="float32")
            reproject(
                source=rasterio.band(src, idx),  # streamed from disk, low memory
                destination=dst,
                src_transform=src.transform,
                src_crs=src.crs,
                src_nodata=src_nodata,
                dst_transform=dst_transform,
                dst_crs=DST_CRS,
                dst_nodata=fill,
                resampling=Resampling.average,
            )
            return dst

        if band_count >= 3:
            print("Bands >= 3: rendering first 3 bands as RGB")
            chans = [warp_band(i) for i in (1, 2, 3)]
            valid = ~np.isnan(chans[0])
            rgb = np.dstack([percentile_stretch(c, valid) for c in chans])
        else:
            print(f"Bands = {band_count}: applying vegetation colormap to band 1")
            b1 = warp_band(1)
            valid = ~np.isnan(b1)
            if valid.sum():
                lo, hi = np.percentile(b1[valid], [2, 98])
                if hi <= lo:
                    hi = lo + 1
                norm = np.clip((b1 - lo) / (hi - lo), 0, 1)
            else:
                norm = np.zeros_like(b1)
            norm = np.nan_to_num(norm)
            rgb = vegetation_colormap(norm)

        # Alpha: transparent where there is no valid source data.
        alpha = np.where(valid, 255, 0).astype(np.uint8)
        rgba = np.dstack([rgb, alpha])

    from PIL import Image

    out_png = os.path.join(OUTPUT_DIR, "ortho.png")
    Image.fromarray(rgba, mode="RGBA").save(out_png)

    # Leaflet LatLngBounds: [[south, west], [north, east]]
    out_bounds = os.path.join(OUTPUT_DIR, "ortho_bounds.json")
    with open(out_bounds, "w") as f:
        json.dump({"bounds": [[south, west], [north, east]]}, f, indent=2)

    print(f"Wrote: {out_png}")
    print(f"Wrote: {out_bounds}")
    print("Done. Run the frontend copy step (npm run dev) to pick these up.")


if __name__ == "__main__":
    main()
