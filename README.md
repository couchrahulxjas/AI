# Disaster Evacuation System - Algorithm Visualizer

A high-performance algorithmic visualizer designed to simulate and compare optimal pathfinding strategies in a dynamic, hazardous disaster scenario. Build out a custom city framework completely autonomously on your browser—no backend required.

## 🎯 Motivation

During a natural disaster—such as a localized flood, violent fire, or disruptive earthquake—finding a path to safety isn't simply about drawing a straight line. True autonomous system tracking requires evaluating variables such as impassable collapsed structures (walls) and dangerous terrain (hazards) that actively slow down traversal. 

The motivation behind this project is to serve as both an educational and deeply experimental testbed. It visually demonstrates the raw computational differences between classic pathfinding algorithms (like standard Breadth-First-Search and Depth-First-Search) against weighted heuristic-driven algorithms (like Uniform Cost Search, Greedy Best-First, and A*). It highlights exactly *why* algorithms like A* are considered the gold standard for autonomous vehicle routing and AI evacuation logic—balancing exploration speed with guaranteed short paths while intelligently steering around treacherous hazard zones.

## 🛠️ Interactive Map Controls

You have complete authoring control over the generated disaster scenarios mapped out on the grid. Here is how to quickly engage with the visualizer to construct your own challenges:

- **Move Civilian & Shelter:** `Left-Click` and drag the vibrant green "Start" dot (Civilian) or the dark green "End" square (Shelter) to relocate them anywhere on the map instantly.
- **Erect Blockades (Walls):** `Left-Click` and drag across any empty grid cell to draw impenetrable walls—simulating collapsed buildings or fully blocked roads that forces the AI to completely reroute.
- **Spawn Hazard Zones:** `Right-Click` and drag across any empty space to draw deadly hazards! Hazardous cells (dark red) are *technically* passable but come at a massive 5x traversal penalty. Algorithms like A* and UCS will actively attempt to skirt around them if a safer alternate route exists.
- **Eraser Mode:** To clear an obstacle, simply click on an existing wall or hazard again to revert it back to an empty road.
- **Resetting Runs:** Hitting the **Reset** button cleans the algorithmic exploration paths but *preserves* your custom-drawn walls, hazards, and start/end locations, so you can easily run and compare multiple different algorithms on the precise same maze design!

## ⚙️ Algorithms Benchmarked

- **BFS (Breadth-First):** Explores blindly outward in every direction. Unweighted.
- **DFS (Depth-First):** Plunges deep down paths before backtracking. Not optimal.
- **DLS (Depth-Limited):** An exploration capped variant of DFS simulating harsh memory constraints.
- **UCS (Uniform Cost):** Systematically analyzes traversal weights to find the safest path, ignoring distance heuristics. 
- **Greedy Best-First:** Heuristically lunges aggressively towards the destination; exceptionally fast but blind to optimal safety routes.
- **A* (A-Star):** The ultimate standard balancing exact cost tracing with a manhattan distance priority heuristic.

## 🚀 Running the Project

No dependencies or servers are required. Simply double-click the `index.html` file to instantly launch the Disaster Evacuation System natively in any web browser.
