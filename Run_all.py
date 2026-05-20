import subprocess

notebooks = [
    "Notebooks/Tile_raster.ipynb",
    "Notebooks/Convert_tif_to_jpg.ipynb",
    "Notebooks/Seedling_predictions.ipynb"
]

for nb in notebooks:

    print(f"\nRunning {nb}...\n")

    subprocess.run([
        "jupyter",
        "nbconvert",
        "--to",
        "notebook",
        "--execute",
        "--inplace",
        nb
    ], check=True)

print("\nPipeline complete.\n")
