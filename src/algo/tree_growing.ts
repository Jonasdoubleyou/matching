import { AdjacencyList } from "../datastructures/adjacency_list";
import { assert } from "../util/assert";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer } from "./base";




export const TreeGrowingMatcher: Matcher = function* PathGrowingMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    visualize?.addLegend({
        blue: "visited",
        red: "solution",
        yellow: "circle detected"
    });

    const label = new Array<'chosen' | 'visited'>(input.nodes.length);
    const picked = new Array<EdgeBase | undefined>(input.nodes.length);
    visualize?.data("picked", picked);
    visualize?.data("label", label);

    const adjacencyList = new AdjacencyList();
    visualize?.data("adjacencyList", adjacencyList.adjacencyList);
    yield* adjacencyList.fill(input, visualize);

    function* augmentTree(node: NodeBase) {
        while (node) {
            if (!picked[node.id]) return;
            if (!label[node.id]) return;
            const edge = picked[node.id];
            if (!edge) return;
            
            visualize?.pickEdge(picked[node.id]!, null);
            label[node.id] = "visited";
            visualize?.pickNode(node, 'blue');
            visualize?.pickEdge(edge, 'blue');
            yield;


            const nextNode = edge.from.id === node.id ? edge.to : edge.from;
            const nextEdge = picked[nextNode.id];
            if (!nextEdge) return;
            label[nextNode.id] = "chosen";
            visualize?.pickNode(nextNode, 'red');
            visualize?.pickEdge(nextEdge, 'red');
            node = nextEdge.from.id === nextNode.id ? nextEdge.to : nextEdge.from;
        }
    }

    function* growTree(node: NodeBase, path: NodeBase[]): Generator<void, number> {
        console.log("Grow Tree", node, path);

        if (label[node.id]) return 0;
        const edges = adjacencyList.edgesOf(node);
        if (!edges.length) return 0;
        
        label[node.id] = "visited";
        visualize?.pickNode(node, 'blue');
        yield;

        let maxScore = 0;
    
        const sortedEdges = [...edges].sort((a, b) => b.weight - a.weight);
        for (const edge of sortedEdges) {
            const nextNode = edge.from.id === node.id ? edge.to : edge.from;
            if (path.length > 0 && path[path.length - 1] === nextNode) continue;
            if (label[nextNode.id]) {
                visualize?.pickEdge(edge, 'yellow');
                continue;
            }

            const subScore = yield* growTree(nextNode, [...path, node]);
            console.log("SubScore ", subScore, "edge weight", edge.weight);
            if (edge.weight - subScore > maxScore) {
                label[node.id] = "chosen";
                visualize?.pickNode(node, 'red');
                // Augment previously picked edge
                if (picked[node.id]) {
                    visualize?.pickEdge(picked[node.id]!, null);
                }
                yield* augmentTree(nextNode);

                picked[node.id] = edge;
                visualize?.pickEdge(edge, 'red');
                maxScore = edge.weight - subScore;

                visualize?.message(`Add Edge from Node ${node.id} that adds ${edge.weight} weight and looses ${subScore}`);
                yield;
            }
        }
        return maxScore;
    }

    for (const node of input.nodes) {
        yield* growTree(node, []);
    }

    const solution: Matching = [];
    for (const [nodeID, pickedEdge] of picked.entries()) {
        if (!pickedEdge) continue;
        if (label[nodeID] !== "chosen") continue;
        solution.push(pickedEdge);
    }

    return solution;
}