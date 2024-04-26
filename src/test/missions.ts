import { EdgeBase, Graph, NodeBase } from "../algo/base";

export interface Mission {
    name: string;
    input: Graph;
    bestScore?: number;
}

function buildGraph(nodeCount: number, buildEdges: (nodes: NodeBase[]) => EdgeBase[]): Graph {
    const nodes = Array.from({ length: nodeCount }, (_, id) => ({ id }));
    const edges = buildEdges(nodes);

    return { nodes, edges };
}

export const missions: Mission[] = [
    {
        name: "Empty",
        input: {
            nodes: [],
            edges: []
        },
        bestScore: 0
    },
    {
        name: "Single Edge",
        input: buildGraph(2, node => ([
            { from: node[0], to: node[1], weight: 1 }
        ])),
        bestScore: 1
    },
    {
        name: "Two disjunct Edges",
        input: buildGraph(4, node => ([
            { from: node[0], to: node[1], weight: 1 },
            { from: node[2], to: node[3], weight: 1 },
        ])),
        bestScore: 2
    },
    {
        name: "One node, two departing edges",
        input: buildGraph(3, node => ([
            { from: node[0], to: node[1], weight: 1 },
            { from: node[0], to: node[2], weight: 2 },
        ])),
        bestScore: 2
    },
    {
        name: "One node, two arriving edges",
        input: buildGraph(3, node => ([
            { from: node[1], to: node[0], weight: 1 },
            { from: node[2], to: node[0], weight: 2 },
        ])),
        bestScore: 2
    },
    {
        name: "Circle",
        input: buildGraph(4, node => ([
            { from: node[0], to: node[1], weight: 1 },
            { from: node[1], to: node[2], weight: 2 },
            { from: node[2], to: node[3], weight: 2 },
            { from: node[3], to: node[0], weight: 2 },
        ])),
        bestScore: 4
    },
    {
        name: "3 Edge path",
        input: buildGraph(4, node => ([
            { from: node[0], to: node[1], weight: 2 },
            { from: node[1], to: node[2], weight: 3 },
            { from: node[2], to: node[3], weight: 2 },
        ])),
        bestScore: 4
    }
];