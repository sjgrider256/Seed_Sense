# Seed_Sense
Detection of pine seedlings using CenterNet anchorless object detection and false color UAV imagery

# Use
Attaining an accurate measure of seedling survival is an essential step in managing pine
plantations. The most common method used to estimate seedling survival is boots-on-the-ground
plot sampling. This method is expensive and time consuming. To keep costs down the sampling
percentage is often very low. A model that can identify seedlings based on a drone orthophoto
provides a much larger sample and allows specific areas of concern to be identified and mapped.
The results can be used on their own, or in combination with plot sampling, to produce a more
accurate representation of seedling survival in an efficient and cost-effective manner.

# Quick start Guide
Clone the repo
pip install -r requirements.txt
python Run_all.py


1. Open a terminal (PowerShell, Command Prompt, Bash, etc.)
2. Navigate to the directory where you want to clone the repository: "cd __your directory path__ "
3. Clone ths repository:
   ```bash
   git clone https://github.com/sjgrider256/Seed_Sense.git
   ```
4. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
5. Upload your orthomosaic tif file to Seed_Sense/Data/Geotiffs. A downsized sample geotif file is included by default for demonstration purposes; you must delete and replace this file to make predicitons on you own geotiff.
6. Run all notebooks
    ```bash
   python Run_all.py
   ```
   Files are saved to Data > Output
