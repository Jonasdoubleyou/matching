import { Graph } from "../algo";
import { Mission } from "./missions";

export function generateRandomMission(nodeCount: number, edgeCount: number) {
    const graph: Graph = {
        nodes: [],
        edges: []
    };

    graph.nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i + 1 }));
    
    const randomNode = () => graph.nodes[Math.floor(Math.random() * graph.nodes.length)];

    graph.edges = Array.from({ length: edgeCount }, (_, i) => ({
        from: randomNode(),
        // TODO: Exclude reflexive edge, as those are useless in matching
        to: randomNode(),
        // TODO: Better distribution
        weight: i
    }));

    const mission: Mission = {
        input: graph,
        name: `Random ${nodeCount} x ${edgeCount}`
    };

    return mission;
}