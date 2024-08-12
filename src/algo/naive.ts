import { AdjacencyList } from "../datastructures/adjacency_list";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer, getScore } from "./base";

/* Naive Matching (Optimal, O(deg(|V|) ** |V|))
 *
 * Computes all edge combinations and then takes the combination with the maximum weight. As such it is guaranteed
 * to find the optimal solution. However generating all combinations results in exponential runtime,
 * and is thus only feasible for very small graphs.
 * 
 */
export const NaiveMatcher: Matcher = function* GreedyMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    visualize?.addLegend({
        "blue": "solution"
    });

    // The naive matcher has exponential runtime and will fail for larger graphs
    if (input.nodes.length > 50) {
        visualize?.step("Cannot run the Naive matcher on larger graphs due to exponential runtimes");
        return [];
    }

    const adjacencyList = new AdjacencyList();
    visualize?.data("Adjacency List", adjacencyList.adjacencyList);
    
    yield* adjacencyList.fillForward(input, visualize);

    const flattenedList = [...adjacencyList.entries()];
    const usedNodes = new Array<boolean>(input.nodes.length);
    
    function *iterate(index: number, solution: EdgeBase[]): Generator<EdgeBase[], void, void> {
        if (index >= flattenedList.length) {
            yield solution;
            return;
        }

        yield* iterate(index + 1, solution);


        const { node: fromNode, edges } =  flattenedList[index];
        if (usedNodes[fromNode.id]) {
            return;
        }

        usedNodes[fromNode.id] = true;   
        
        for (const edge of edges) {
            if (usedNodes[edge.to.id]) continue;

            solution.push(edge);

            const addTo = !usedNodes[edge.to.id];
            if (addTo) usedNodes[edge.to.id] = true;
        
            yield* iterate(index + 1, solution);
            
            solution.pop();
            if (addTo) usedNodes[edge.to.id] = false;
        }

        usedNodes[fromNode.id] = false;
    }

    let bestSolution: Matching = [];
    for (const solution of iterate(0, [])) {
        if (visualize) {
            for (const edge of solution)
                visualize.pickEdge(edge, 'blue');
        }

        if (getScore(solution) > getScore(bestSolution)) {
            bestSolution = [...solution];
        }

        yield;
        visualize?.removeHighlighting();
    }

    for (const edge of bestSolution)
        visualize?.pickEdge(edge, "blue");

    return bestSolution;
}

