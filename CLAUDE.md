# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Seed_Sense is a geospatial deep learning pipeline for automated pine seedling detection from UAV/aerial imagery. It processes large GeoTIFF orthomosaics through a three-stage pipeline: tiling, format conversion, and inference using a pretrained CenterNet-based hourglass CNN.

## Running the Pipeline

**Full pipeline execution:**
```bash
python Run_all.py
```

This sequentially executes three Jupyter notebooks using `jupyter nbconvert --execute --inplace`:
1. `Notebooks/Tile_raster.ipynb` - Tiles large GeoTIFF into 1024x1024 patches
2. `Notebooks/Convert_tif_to_jpg.ipynb` - Converts tiles to JPG format
3. `Notebooks/Seedling_predictions.ipynb` - Runs inference and generates outputs

**Running individual stages:**
```bash
jupyter nbconvert --to notebook --execute --inplace Notebooks/<notebook_name>.ipynb
```

**Installing dependencies:**
```bash
pip install -r requirements.txt
```

## Pipeline Architecture

### Stage 1: Tile_raster.ipynb
- Reads first `.tif` file from `Data/Geotiffs/`
- Tiles into 1024x1024 patches with spatial indexing
- Outputs to `Data/Tiles/` as GeoTIFF tiles with georeferencing preserved
- Creates `tile_index.csv` mapping tile names to geographic bounds (minx, miny, maxx, maxy)
- Includes visualization of tile grid overlay on downsampled orthomosaic

**Key parameter:** `tile_size = 1024` (must match model input expectations)

### Stage 2: Convert_tif_to_jpg.ipynb
- Converts all `.tif` tiles in `Data/Tiles/` to `.jpg` format
- Extracts first 3 bands (RGB), discarding 4th band if present (common in DJI imagery)
- Clips values to 0-255 and saves as uint8 JPEGs at 90% quality
- Silently skips tiles that fail conversion

### Stage 3: Seedling_predictions.ipynb
- Loads pretrained model weights from `seedling_hourglass_weights.pth` (must exist in root)
- Processes only full 1024x1024 tiles (automatically skips partial edge tiles)
- Uses CenterNet-based anchorless object detection with offset regression
- Outputs two products to `Data/Output/`:
  1. **Per-seedling points** as shapefile and GeoJSON (`all_seedling_predictions.{shp,geojson}`) — one feature per detected seedling
  2. **Per-tile counts** as GeoJSON (`tile_seedling_counts.geojson`) — one polygon per tile (bounding box) annotated with its seedling count, aggregated from the detections

**Model architecture:** HourglassCenterNetTiny
- 3-channel input, stride-8 output (128x128 heatmap for 1024x1024 input)
- 3 output channels: heatmap logits, dx offset, dy offset
- Encoder-bottleneck-decoder structure with skip connections

**Inference parameters in `decode_centers()`:**
- `stride=8`: Model output downsampling factor
- `conf_thresh=0.4`: Minimum confidence for detection (adjustable for precision/recall tradeoff)
- `min_dist=100`: Minimum pixel distance between detections (radial NMS)
- `maxpool_ks=7`: Kernel size for grid-level local maxima suppression
- `topk=300`: Max detections per tile before radial filtering

**Coordinate transformation flow:**
1. Model outputs grid coordinates (ys, xs) + subpixel offsets (dx, dy)
2. Pixel coords = `(xs + dx) * stride`, `(ys + dy) * stride`
3. Geographic coords via rasterio tile transform: `tile_transform * (px, py)`

## Output Format

**Per-seedling points (`all_seedling_predictions.{shp,geojson}`):**
- Root: FeatureCollection with CRS inherited from input GeoTIFF
- Each Feature represents one detected seedling with:
  - `properties.tile`: Source tile filename (`.jpg`) for traceability
  - `properties.confidence`: Currently hardcoded to 1.0 (confidence scores not preserved from model)
  - `geometry`: Point with coordinates in source CRS (typically UTM meters)

**Per-tile counts (`tile_seedling_counts.geojson`):**
- Root: FeatureCollection with CRS inherited from input GeoTIFF
- Each Feature represents one tile (bounding box polygon) with:
  - `properties.tile name`: Tile filename from `tile_index.csv`
  - `properties.seedling count`: Number of seedlings detected in that tile (0 for tiles with no detections, including skipped edge tiles)
  - `properties.minx/miny/maxx/maxy`: Geographic bounds of the tile
  - `geometry`: Polygon (rectangle) built from the tile bounds via `shapely.geometry.box`
- Counts are derived by mapping each tile's detection count back onto the rows of `tile_index.csv` (keyed by `.tif` name), so every indexed tile appears even if it contains zero seedlings.

**Note:** Confidence scores from the heatmap are used during NMS in `decode_centers()` but not written to final output. To preserve per-detection confidence, modify the coordinate transformation loop in Seedling_predictions.ipynb to extract scores from the tensor alongside coordinates.

**Coordinate system requirement:** The CRS of all outputs is inherited from the input orthomosaic. The frontend map viewer supports geographic WGS84 (EPSG:4326), Web Mercator (EPSG:3857), and WGS84/UTM zones (EPSG `326xx` north / `327xx` south). Input imagery in any other CRS must be reprojected to a WGS84/UTM zone before running the pipeline, or the viewer will refuse to render. There is intentionally no fallback CRS.

## Working Directory Management

All three notebooks include automatic working directory correction:
```python
if os.path.basename(current_dir) == "Notebooks":
    os.chdir("..")
```

This ensures paths like `Data/Geotiffs` resolve correctly whether running from root or `Notebooks/` directory.

## Data Flow & Directory Structure

```
Data/
├── Geotiffs/        # Input: Place orthomosaic .tif here
├── Tiles/           # Intermediate: 1024x1024 .tif and .jpg tiles + tile_index.csv
└── Output/          # Final: all_seedling_predictions.{shp,geojson,etc} + tile_seedling_counts.geojson
```

**Expected input:** Single GeoTIFF orthomosaic in `Data/Geotiffs/` (first `.tif` file found is processed)

**Critical files:**
- `seedling_hourglass_weights.pth` (9.8 MB PyTorch checkpoint in root)
- `Data/Tiles/tile_index.csv` (required for coordinate transformation)

## Frontend (Map Viewer)

A standalone React + Leaflet SPA lives in `frontend/` and is fully decoupled from the Python pipeline. It visualizes per-tile seedling counts from `Data/Output/tile_seedling_counts.geojson`: each tile polygon is shaded white → dark blue by its `seedling count`, labeled with the count, and accompanied by a color legend.

**Stack:** Vite + React, `react-leaflet`/`leaflet`, `proj4` (client-side reprojection). JavaScript (no TypeScript).

**Running it:**
```bash
cd frontend
npm install
npm run dev      # or: npm run build
```

**Data flow:** `npm run dev` and `npm run build` first run `scripts/copy-data.js` (wired via the `predev`/`prebuild` npm lifecycle hooks), which copies backend artifacts into `frontend/public/data/` (Vite serves `public/` at the web root; `public/data` is gitignored). The app `fetch`es from `/data/` and never reads the `Data/` tree directly. Files copied:
- `tile_seedling_counts.geojson` — **required**; if missing, the copy script exits with an error telling the user to run `python Run_all.py` first.
- `all_seedling_predictions.geojson` — **optional**; powers the seedling-point overlay.
- `ortho.png` + `ortho_bounds.json` — **optional**; power the orthomosaic overlay (produced by `tools/prepare_ortho.py`, see below).

Missing optional files are warned about (not fatal) and simply disable their overlay.

**CRS handling:** `src/lib/reproject.js` detects the EPSG code from the GeoJSON `crs` member and reprojects to WGS84 for Leaflet. Supported: EPSG:4326, EPSG:3857, and WGS84/UTM zones (326xx/327xx). Unsupported or missing CRS → the viewer renders an error panel instead of a map (no fallback).

**Layers:**
- The per-tile count choropleth (count labels + legend) is always shown.
- **Seedling points** (`all_seedling_predictions.geojson`) — optional overlay toggled via the layers control (top-right, default off); seedlings render as dark-red `Circle`s with a radius in meters, so they scale with zoom.
- **Orthomosaic** — optional `ImageOverlay` toggled via the same control (default off). It is placed in a dedicated Leaflet pane (`zIndex` 250) so it draws above the basemap (200) but below the polygons/points (overlayPane 400).
- `MapContainer` `maxZoom` is raised (the OSM basemap goes blank past its native zoom, which is acceptable for these rural plots).

**Orthomosaic prep (`tools/prepare_ortho.py`):** Standalone rasterio utility, separate from the detection pipeline (does not modify `Run_all.py`, notebooks, or `requirements.txt`). Source GeoTIFFs are often multi-GB and cannot be loaded in-browser, so this reads the source, warps/downsamples it to WGS84 (default max 4096 px, `--max-dim` to change), renders the first 3 bands as RGB (or a vegetation colormap for single-band index rasters), and writes `Data/Output/ortho.png` (RGBA, transparent where nodata) + `Data/Output/ortho_bounds.json` (Leaflet `[[south, west], [north, east]]`). Warping to WGS84 makes the overlay align with the (also-WGS84) vector layers. Re-run after changing the input imagery.

**Out of scope:** No upload, API, desktop packaging, filtering, or marker clustering.

## Device & Performance

Model automatically selects CUDA if available:
```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
```

Batch size is hardcoded to 4 in DataLoader. GPU memory requirements are minimal for this model size.

## Common Modifications

**Adjusting detection sensitivity:**
- Increase `conf_thresh` in `decode_centers()` for fewer false positives
- Decrease `min_dist` to detect more densely packed seedlings

**Changing tile size:**
- Update `tile_size` in Tile_raster.ipynb
- Model expects 1024x1024, so non-standard sizes require model retraining

**Processing different imagery:**
- Ensure input is 3+ band GeoTIFF with valid CRS
- Pipeline handles multi-band imagery by extracting first 3 bands as RGB
