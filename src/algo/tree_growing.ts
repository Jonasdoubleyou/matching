import { AdjacencyList } from "../datastructures/adjacency_list";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer } from "./base";


/* Tree Growing Matcher - Like the blossom algorithm, without blossoms - Makes it much easier to follow and build
 * up knowledge. Apart from that it is pretty useless as it is as slow as the Blossom algorithm, but not as good
 */
export const TreeGrowingMatcher: Matcher = function* PathGrowingMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    visualize?.addLegend({
        blue: "visited",
        red: "solution",
        yellow: "circle detected"
    });

    // As we build a tree, each edge can be uniquely assigned to a parent node in the tree
    // On this parent node we store additional information about the edge. Thus we only require O(|V|) instead of
    // O(|E|) storage
    const label = new Array<'chosen' | 'visited'>(input.nodes.length);
    const picked = new Array<EdgeBase | undefined>(input.nodes.length);
    visualize?.data("picked", picked);
    visualize?.data("label", label);

    // We could potentially build an adjacency list "on the fly" as we build the trees,
    // but I failed to implement this correctly. It is much easier to reason about a nested tree traversal
    // than the "growing" variant
    const adjacencyList = new AdjacencyList();
    visualize?.data("adjacencyList", adjacencyList.adjacencyList);
    yield* adjacencyList.fill(input, visualize);

    // Augments a tree down the subpath by swapping all chosen and non chosen nodes
    function* augmentTree(node: NodeBase) {
        while (node) {

            // --> (picked)   -[picked edge]--> (visited) -[edge]-> ...
            //        v            v             v         v
            // --> (visited)  -[edge]---------> (picked)  -[picked edge]-> ...

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

    // Recursive iterator over a tree, which grows the result by adding edges from bottom to top,
    // augmenting down if necessary
    function* growTree(node: NodeBase, path: NodeBase[]): Generator<void, number> {
        console.log("Grow Tree", node, path);

        if (label[node.id]) return 0;
        const edges = adjacencyList.edgesOf(node);
        if (!edges.length) return 0;
        
        label[node.id] = "visited";
        visualize?.pickNode(node, 'blue');
        visualize?.message(`Visiting ${node.id}`);
        yield;

        let maxScore = 0;
    
        // Here we additionally sort the edges descending by weight
        // This is mainly to avoid heavy edges being excluded by the circle exclusion below
        const sortedEdges = [...edges].sort((a, b) => b.weight - a.weight);

        for (const edge of sortedEdges) {
            const nextNode = edge.from.id === node.id ? edge.to : edge.from;
            // Skip the backwards path up the stack
            if (path.length > 0 && path[path.length - 1] === nextNode) continue;

            // Detect cycles (nodes that were already visited) and skip them
            // NOTE: This might skip over the perfect solution, which makes this solution imperfect
            // To work with cycles, we need to extend the algorithm to deal with blossoms - then we arrive at the Blossom
            // algorithm
            if (label[nextNode.id]) {
                visualize?.pickEdge(edge, 'yellow');
                visualize?.message(`Cycle detected`);
                yield;
                continue;
            }

            // Descend into all subtrees, the subScore is the cost of augmenting the tree to free the nextNode
            const subScore = yield* growTree(nextNode, [...path, node]);
            console.log("SubScore ", subScore, "edge weight", edge.weight);

            // Adding this edge to the solution is only beneficial if adding the edge outweighs augmenting the subtree
            // Also from the current node we can only keep one departing edge, thus we track the "maxScore"
            if (edge.weight - subScore > maxScore) {
                visualize?.step(`Augment to add edge ${edge.from.id} - ${edge.to.id}`);
                // Augment previously picked edge
                if (picked[node.id]) {
                    // Here we could potentially undo the augmentation that was done to add
                    // the previous subtree - but I think this cannot be beneficial as we sort edges
                    visualize?.pickEdge(picked[node.id]!, null);
                }

                // Augment the subtree if necessary to ensure that the next node is free
                yield* augmentTree(nextNode);

                // Afterwards add the current edge to the solution
                label[node.id] = "chosen";
                visualize?.pickNode(node, 'red');
                picked[node.id] = edge;
                visualize?.pickEdge(edge, 'red');
                maxScore = edge.weight - subScore;

                visualize?.message(`Add Edge from Node ${node.id} that adds ${edge.weight} weight and looses ${subScore}`);
                yield;
            }
        }
        return maxScore;
    }

    // Grow trees from each potential root node
    //  For most nodes this will just short circuit as they are already part of a previous tree
    for (const node of input.nodes) {
        yield* growTree(node, []);
    }

    // Another O(|V|) pass to extract all edges from chosen nodes
    // Could potentially be avoided using a smarter datastructure
    const solution: Matching = [];
    for (const [nodeID, pickedEdge] of picked.entries()) {
        if (!pickedEdge) continue;
        if (label[nodeID] !== "chosen") continue;
        solution.push(pickedEdge);
    }

    return solution;
}