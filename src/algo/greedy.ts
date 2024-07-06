import { Graph, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer } from "./base";

/* Greedy Matching (approximation, O(|E| log |E|))
 *
 * Sort all edges descending by weight,
 * then iterate over the edges and add them to the result set,
 * while keeping a set of used nodes, skip edges where one of the nodes
 * is in the set.
 * 
 * Sorting the edges is O(|E] log |E|),
 * iterating them and maintaining the node set is O(|E|).
 * 
 * Trivial cases where this does not produce the optimal result:
 * - Path of length 3, with the middle section having the most weight,
 *    but the sum of the weight of the other two edges is bigger
 * 
 * c.f. "A simple approximation algorithm for the weighted matching problem", Drake and Hougardy
 */
export const GreedyMatcher: Matcher = function* GreedyMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    visualize?.step("1. Sort edges descending by weight in O(|E| log |E|)");
    visualize?.data("Edges by weight", input.edges);
    yield;

    const edgesByWeight = [...input.edges].sort((a, b) => b.weight - a.weight);
    visualize?.data("Edges by weight", edgesByWeight);
    yield;

    const result: Matching = [];
    visualize?.data("result", result);

    const usedNodes = new Set<NodeBase>();
    visualize?.data("used nodes", usedNodes);

    visualize?.step("2. Traverse edges and filter out based on usedNodes O(|E] log |V|)");
    for (const heaviestEdge of edgesByWeight) { // O(|E|)
        visualize?.currentEdge(heaviestEdge);
        
        if (usedNodes.has(heaviestEdge.from)) { // O(1)
            visualize?.message("Edge departs from existing node");
            visualize?.currentNode(heaviestEdge.from);
            yield;
            continue;
        }

        if (usedNodes.has(heaviestEdge.to)) { // O(1)
            visualize?.message("Edge arrives at existing node");
            visualize?.currentNode(heaviestEdge.to);
            yield;
            continue;
        }

        result.push(heaviestEdge);
        visualize?.pickEdge(heaviestEdge, "blue");
        yield;

        usedNodes.add(heaviestEdge.from); // O(1)
        usedNodes.add(heaviestEdge.to); // O(1)
        visualize?.pickNode(heaviestEdge.from, "blue");
        visualize?.pickNode(heaviestEdge.to, "blue");
        yield;
    }

    return result;
};