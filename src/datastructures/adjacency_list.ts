import { EdgeBase, NodeBase, ReadonlyGraph, Visualizer } from "../algo";
import { assert } from "../util/assert";

// Compact representation of a graph as an adjacency list
export class AdjacencyList<Node extends NodeBase, Edge extends EdgeBase<Node>> {
    adjacencyList: (Readonly<Edge>[] | undefined)[] = [];
    count = 0;
    graph?: ReadonlyGraph;

    *fill(graph: ReadonlyGraph<Node, Edge>, visualize?: Visualizer) {
        this.graph = graph;

        for (const edge of graph.edges) {
            visualize?.currentEdge(edge);
            if (!this.adjacencyList[edge.from.id]) {
                this.adjacencyList[edge.from.id] = [];
                this.count += 1;
            }
            if (!this.adjacencyList[edge.to.id]) {
                this.adjacencyList[edge.to.id] = [];
                this.count += 1;
            }
    
            this.adjacencyList[edge.from.id]!.push(edge);
            this.adjacencyList[edge.to.id]!.push(edge);
            yield;
        }
    }

    *fillForward(graph: ReadonlyGraph<Node, Edge>, visualize?: Visualizer) {
        this.graph = graph;

        for (const edge of graph.edges) {
            visualize?.currentEdge(edge);
            if (!this.adjacencyList[edge.from.id]) {
                this.adjacencyList[edge.from.id] = [];
                this.count += 1;
            }
            this.adjacencyList[edge.from.id]!.push(edge);

            yield;
        }
    }

    *remove(node: Node) {
        const departingEdges = this.adjacencyList[node.id];
        if (!departingEdges) return;

        this.adjacencyList[node.id] = undefined;
        this.count -= 1;

        for (const edge of departingEdges) {
            const other = edge.from === node ? edge.to : edge.from;
            const otherDeparting = this.adjacencyList[other.id];
            if (otherDeparting) {
                if (otherDeparting.length === 1) {
                    assert(otherDeparting[0] === edge, "Malformed adjacency list");
                    this.adjacencyList[other.id] = undefined;
                    this.count -= 1;
                } else {
                    const index = otherDeparting.indexOf(edge);
                    assert(index !== -1, "Malformed adjacency list");
                    otherDeparting.splice(index, 1);
                }
            }
        }
    }

    empty() { return this.count === 0; }

    has(node: Node) { return !!this.adjacencyList[node.id]; }

    edgesOf(node: Node) {
        return this.adjacencyList[node.id] ?? [];
    }

    *entries() {
        for (const [nodeID, edges] of this.adjacencyList.entries()) {
            if (!edges || !edges.length) continue;
            yield { node: this.graph!.nodes[nodeID], edges };
        }
    }

    values() {
        return this.adjacencyList.values();
    }
}