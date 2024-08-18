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
        name: "Triangle",
        input: buildGraph(3, node => ([
            { from: node[0], to: node[1], weight: 1 },
            { from: node[1], to: node[2], weight: 1 },
            { from: node[0], to: node[2], weight: 10 },
        ])),
        bestScore: 10
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
    },
    {
        name: "4 edge path",
        input: buildGraph(5, node => ([
            { from: node[0], to: node[1], weight: 10 },
            { from: node[1], to: node[2], weight: 1 },
            { from: node[2], to: node[3], weight: 1 },
            { from: node[3], to: node[4], weight: 9 },        
        ])),
        bestScore: 19,
    },
    {
        name: "5 edge path",
        input: buildGraph(6, node => ([
            { from: node[0], to: node[1], weight: 10 },
            { from: node[1], to: node[2], weight: 1 },
            { from: node[2], to: node[3], weight: 1 },
            { from: node[3], to: node[4], weight: 9 },
            { from: node[4], to: node[5], weight: 9 },        
        ])),
        bestScore: 20,
    },
    {
        name: "6 edge path",
        input: buildGraph(7, node => ([
            { from: node[0], to: node[1], weight: 10 },
            { from: node[1], to: node[2], weight: 1 },
            { from: node[2], to: node[3], weight: 2 },
            { from: node[3], to: node[4], weight: 9 },
            { from: node[4], to: node[5], weight: 9 },
            { from: node[5], to: node[6], weight: 2 },        
        ])),
        bestScore: 21,
    },
    {
        name: "Tree",
        input: buildGraph(7, node => ([
            { from: node[0], to: node[1], weight: 10 },
            { from: node[0], to: node[2], weight: 1 },
            { from: node[2], to: node[3], weight: 1 },
            { from: node[2], to: node[4], weight: 9 },
            { from: node[1], to: node[5], weight: 9 },
            { from: node[1], to: node[6], weight: 2 },        
        ])),
        bestScore: 19,
    },
    {
        name: "Small Tree",
        input: buildGraph(5, node => ([
            { from: node[0], to: node[1], weight: 2 },
            { from: node[1], to: node[2], weight: 1 },
            { from: node[0], to: node[3], weight: 4 },
            { from: node[3], to: node[4], weight: 5 }
        ])),
        bestScore: 7
    },
    {
        name: "Eight",
        input: buildGraph(6, node => ([
            { from: node[0], to: node[1], weight: 10 },
            { from: node[1], to: node[2], weight: 0 },
            { from: node[2], to: node[3], weight: 0 },
            { from: node[3], to: node[0], weight: 8 },
            { from: node[0], to: node[4], weight: 5 },
            { from: node[1], to: node[5], weight: 5 },
            { from: node[4], to: node[5], weight: 5 }    
        ])),
        bestScore: 15
    },
    {
        name: "Three Loops",
        input: buildGraph(8, node => ([
            { from: node[0], to: node[1], weight: 10 },
            { from: node[1], to: node[2], weight: 0 },
            { from: node[2], to: node[3], weight: 0 },
            { from: node[3], to: node[0], weight: 8 },
            { from: node[0], to: node[4], weight: 5 },
            { from: node[1], to: node[5], weight: 5 },
            { from: node[4], to: node[5], weight: 5 },
            { from: node[0], to: node[6], weight: 5 },
            { from: node[1], to: node[7], weight: 5 },
            { from: node[6], to: node[7], weight: 5 }   
        ])),
        bestScore: 20
    },
    {
        name: "Three loose Edges",
        input: buildGraph(6, node => ([
            { from: node[0], to: node[1], weight: 10 },
            { from: node[2], to: node[3], weight: 10 },
            { from: node[4], to: node[5], weight: 9 }, 
        ])),
        bestScore: 29
    }
];