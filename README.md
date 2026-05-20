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


1. Clone this repository:
   ```bash
   git clone https://github.com/lzillmer/CSE-6242-Project.git
   cd CSE-6242-Project
   ```
navigate to the repo directory in terminal

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
3. Upload your orthomosaic tif file to Data/Geotiffs
4. python Run_all.py
