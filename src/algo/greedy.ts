import { Graph, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer } from "./base";

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
        
        if (usedNodes.has(heaviestEdge.from)) { // O(log |V|)
            visualize?.message("Edge departs from existing node");
            visualize?.currentNode(heaviestEdge.from);
            yield;
            continue;
        }

        if (usedNodes.has(heaviestEdge.to)) { // O(log |V|)
            visualize?.message("Edge arrives at existing node");
            visualize?.currentNode(heaviestEdge.to);
            yield;
            continue;
        }

        result.push(heaviestEdge);
        visualize?.pickEdge(heaviestEdge, "blue");
        yield;

        usedNodes.add(heaviestEdge.from);
        usedNodes.add(heaviestEdge.to);
        visualize?.pickNode(heaviestEdge.from, "blue");
        visualize?.pickNode(heaviestEdge.to, "blue");
        yield;
    }

    return result;
};