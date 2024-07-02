import { EdgeBase, NodeBase, Visualizer } from "../algo";
import { assert } from "../util/assert";

// Compact representation of a graph as an adjacency list
export class AdjacencyList<Node extends NodeBase, Edge extends EdgeBase<Node>> {
    adjacencyList: Map<Node, Edge[]> = new Map();
    
    *fill(edges: readonly Readonly<Edge>[], visualize?: Visualizer) {
        for (const edge of edges) {
            visualize?.currentEdge(edge);
            if (!this.adjacencyList.has(edge.from)) {
                this.adjacencyList.set(edge.from, []);
            }
            if (!this.adjacencyList.has(edge.to)) {
                this.adjacencyList.set(edge.to, []);
            }
    
            this.adjacencyList.get(edge.from)?.push(edge);
            this.adjacencyList.get(edge.to)?.push(edge);
            yield;
        }
    }

    *fillForward(edges: readonly Readonly<Edge>[], visualize?: Visualizer) {
        for (const edge of edges) {
            visualize?.currentEdge(edge);
            if (!this.adjacencyList.has(edge.from)) {
                this.adjacencyList.set(edge.from, []);
            }
            this.adjacencyList.get(edge.from)!.push(edge);

            yield;
        }
    }

    *remove(node: Node) {
        const departingEdges = this.edgesOf(node);
        this.adjacencyList.delete(node);
        
        for (const edge of departingEdges) {
            const other = edge.from === node ? edge.to : edge.from;
            const otherDeparting = this.adjacencyList.get(other);
            if (otherDeparting) {
                if (otherDeparting.length === 1) {
                    assert(otherDeparting[0] === edge, "Malformed adjacency list");
                    this.adjacencyList.delete(other);
                } else {
                    const index = otherDeparting.indexOf(edge);
                    assert(index !== -1, "Malformed adjacency list");
                    otherDeparting.splice(index, 1);
                }
            }
        }
    }

    has(node: Node) { return this.adjacencyList.has(node); }
    empty() { return this.adjacencyList.size === 0; }

    edgesOf(node: Node) {
        return this.adjacencyList.get(node) ?? [];
    }

    popNode(): Node {
        return this.adjacencyList.keys().next().value!;
    }

    entries() {
        return this.adjacencyList.entries();
    }

    values() {
        return this.adjacencyList.values();
    }
}