# Weighted Matching Visualization

Project Work at the Hochschule Karlsruhe (HKA) by Jonas Wilms.

**NOTE: The implemented algorithms are provided as-is without the guarantee of correctness**

## Installation

For development, install NodeJS + NPM, then run `npm ci` and `npm start` to get a development setup (the browser will open and changes to the code are directly applied). For productive use, run `npm run build`, then distribute the `/build` to a webserver.

## Project Structure

- `src/datastructures` contains fundamental datastructures such as heaps and adjacency lists
- `src/algo` contains various implementations of weighted matching
  - `./base` contains input & output types and utilities
  - `./naive` contains a naive algorithm that tries all permutations (exponential runtime to the number of nodes)
  - `./greedy` contains a greedy matcher
  - `./path_growing` contains the path growing algorithm as presented by Drake and Hougardy
  - `./blossom` contains "some" implementation of a Blossom algorithm as presented by Edmonds, with ideas from Gabow and Galil
- `src/test` contains a small testsuite (work in progress)
- `src/ui` contains the user interface (as React components)
  - `./base/` contains all fundamental building blocks
  - `./graph/` contains the graph visualization components
  - `./Visualizer` is the main component for visualizing algorithms as they run
  . `./Compare` is the main component for comparing the algorithms with each other
