import { AdjacencyList } from "../datastructures/adjacency_list";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer, getScore } from "./base";


export const NaiveMatcher: Matcher = function* GreedyMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    const adjacencyList = new AdjacencyList();
    visualize?.data("Adjacency List", adjacencyList.adjacencyList);
    
    yield* adjacencyList.fillForward(input.edges, visualize);

    const flattenedList = [...adjacencyList.entries()];
    const usedNodes = new Set<NodeBase>();
    
    function *iterate(index: number, solution: EdgeBase[]): Generator<EdgeBase[], void, void> {
        if (index >= flattenedList.length) {
            yield solution;
            return;
        }

        yield* iterate(index + 1, solution);


        const [fromNode, edges] =  flattenedList[index];
        if (usedNodes.has(fromNode)) {
            return;
        }

        usedNodes.add(fromNode);   
        
        for (const edge of edges) {
            if (usedNodes.has(edge.to)) continue;

            solution.push(edge);

            const addTo = !usedNodes.has(edge.to);
            if (addTo) usedNodes.add(edge.to);
        
            yield* iterate(index + 1, solution);
            
            solution.pop();
            if (addTo) usedNodes.delete(edge.to);
        }

        usedNodes.delete(fromNode);
    }

    let bestSolution: Matching = [];
    for (const solution of iterate(0, [])) {
        console.log("solution", solution);

        if (visualize) {
            for (const edge of solution)
                visualize.pickEdge(edge, 'blue');
        }

        if (getScore(solution) > getScore(bestSolution)) {
            console.log("solution better than bestSolution", solution, bestSolution);
            bestSolution = [...solution];
        }

        yield;
        visualize?.removeHighlighting();
    }

    for (const edge of bestSolution)
        visualize?.pickEdge(edge, "blue");

    return bestSolution;
}

