import { Graph } from "../algo";
import { Mission } from "./missions";

export function generateRandomMission(nodeCount: number, edgeRate: number) {
    const graph: Graph = {
        nodes: [],
        edges: []
    };

    graph.nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));

    for (let a = 0; a < nodeCount; a++) {
        for (let b = a + 1; b < nodeCount; b++) {
            if (a === b) continue;

            if (Math.random() < (edgeRate / 100)) {
                graph.edges.push({
                    from: graph.nodes[a],
                    to: graph.nodes[b],
                    weight: Math.floor(Math.random() * 1000)
                })
            }
        }
    }
    
    console.log("Generated Mission", graph);

    const mission: Mission = {
        input: graph,
        name: `Random ${nodeCount} x ${edgeRate}%`
    };

    return mission;
}