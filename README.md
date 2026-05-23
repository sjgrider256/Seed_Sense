# Seed_Sense

Seed_Sense is a lightweight geospatial deep learning pipeline for automated pine seedling detection from UAV or aerial imagery. The project processes large GeoTIFF orthomosaics by tiling raster imagery into smaller patches, converting tiles into model-compatible image formats, and performing inference using a pretrained hourglass convolutional neural network for anchorless object detection of pine seedlings.

The pipeline is designed to run sequentially on a local machine with minimal user interaction. Users place GeoTIFF imagery into the `Data/Geotiffs` directory, install the required dependencies, and execute the pipeline using a single command.

# Purpose

Attaining an accurate measure of seedling survival is an essential step in managing pine plantations. The most common method used to estimate seedling survival is boots-on-the-ground plot sampling. This method is expensive and time-consuming, and sampling intensity is often kept low to reduce operational costs.

A model capable of identifying seedlings directly from drone orthophotography provides a substantially larger sample size while allowing areas of concern to be spatially identified and mapped. The results can be used independently or in combination with traditional plot sampling to produce a more accurate representation of seedling survival in an efficient and cost-effective manner.

![Output](Help%20docs/IMGs/Untitled_design.png)


# Quick Start Guide

1. Open a terminal (PowerShell, Command Prompt, Bash, etc.)

2. Navigate to the location where you want to download the repository.

3. Clone the repository:

```bash
git clone https://github.com/sjgrider256/Seed_Sense.git
```

4. Navigate into the project directory:

```bash
cd Seed_Sense
```

5. Install dependencies:

```bash
pip install -r requirements.txt
```

6. Upload your orthomosaic `.tif` file to:

```text
Seed_Sense/Data/Geotiffs
```

A downsized sample GeoTIFF is included by default for demonstration purposes. Delete and replace this file to generate predictions on your own orthomosaic.

7. Run the pipeline:

```bash
python Run_all.py
```

Prediction outputs and intermediate files are saved to:

```text
Data/Output
```

# Acknowledgments

The seedling detection architecture implemented in this project is based on the CenterNet object detection framework introduced by Xingyi Zhou, Dequan Wang, and Philipp Krähenbühl in:

> *Objects as Points* (2019)

The original paper reframed object detection as a keypoint estimation problem using anchorless center-point detection.
