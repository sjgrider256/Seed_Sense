# Seed_Sense

Seed_Sense is a lightweight geospatial deep learning pipeline for automated pine seedling detection from UAV or aerial imagery. The project processes large GeoTIFF orthomosaics by tiling raster imagery into smaller patches, converting tiles into model-compatible image formats, and performing inference using a pretrained hourglass convolutional neural network for anchorless object detection of pine seedlings.

The pipeline is designed to run sequentially on a local machine with minimal user interaction. Users place GeoTIFF imagery into the `Data/Geotiffs` directory, install the required dependencies, and execute the pipeline using a single command.

# About

Attaining an accurate measure of seedling survival is an essential step in managing pine plantations. The most common method used to estimate seedling survival is boots-on-the-ground plot sampling. This method is expensive and time-consuming, and sampling intensity is often kept low to reduce operational costs.

A model capable of identifying seedlings directly from drone orthophotography provides a substantially larger sample size while allowing areas of concern to be spatially identified and mapped. The results can be used independently or in combination with traditional plot sampling to produce a more accurate representation of seedling survival in an efficient and cost-effective manner.

![Output](Help%20docs/IMGs/Output_viz.png)


# Quick Start Guide

1. Open a terminal (PowerShell, Command Prompt, Bash, etc.)

2. Navigate to the filepath you want to host the repository.

3. Clone the repository: 

```bash
git clone https://github.com/sjgrider256/Seed_Sense.git
```

4. Navigate to your root directory
   
5. Install dependencies. This process may take 10-20 minutes depending on your machine

```bash
pip install -r requirements.txt
```

6. Manually upload (drag and drop) your orthomosaic `.tif` file to "Seed_Sense/Data/Geotiffs"

   Note: A downsized sample GeoTIFF is included by default for demonstration purposes. Delete and replace this file to generate predictions on your own orthomosaic.

   > **Coordinate system requirement:** the input orthomosaic must be in a **WGS84 / UTM** projected coordinate system (EPSG `326xx` for northern zones or `327xx` for southern zones). Geographic WGS84 (EPSG:4326) and Web Mercator (EPSG:3857) are also accepted. Imagery in any other CRS must be reprojected to the appropriate WGS84/UTM zone before running the pipeline, otherwise the map viewer cannot display the results.

7. Run the pipeline by entering in your commandline:

```bash
python Run_all.py
```

Prediction outputs (GeoJSON & Shapefiles) are saved to:

```text
Data/Output
```

# Visualization

An interactive map viewer is included to explore your results. It displays each tile shaded by its seedling count (light = few seedlings, dark blue = many), with the count labeled on every tile and a color legend. Two optional layers can be toggled on from the top-right corner of the map:

- **Seedling points** — every individual detected seedling.
- **Orthomosaic (optional)** — your source imagery shown beneath the results for context.

The orthomosaic layer requires a one-time preparation step, because the original imagery is too large to display directly. Generate a lightweight web version of your imagery by running from your root directory:

```bash
python tools/prepare_ortho.py
```

To launch the viewer, first install [Node.js](https://nodejs.org) (version 18 or higher), then run from your root directory:

```bash
cd frontend
npm install
npm run dev
```

Open the address shown in the terminal (for example, `http://localhost:5173`) in your web browser. Each time you start the viewer it loads the latest results produced by the pipeline.



# Dependencies

Python 3.11 of higher
```bash
https://www.python.org/downloads/
```

# Acknowledgments

The seedling detection architecture implemented in this project is based on the CenterNet object detection framework introduced by Xingyi Zhou, Dequan Wang, and Philipp Krähenbühl in:

> *Objects as Points* (2019)

The original paper reframed object detection as a keypoint estimation problem using anchorless center-point detection.
