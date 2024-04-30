import { createContext, useContext } from "react";
import { Color, EdgeBase, EdgeID, NodeBase, NodeID, edgeID, nodeID } from "../algo";

export interface ColoringContext {
    coloredEdges: Map<EdgeID, Color>;
    coloredNodes: Map<NodeID, Color>;
    
    currentEdge?: EdgeID;
    currentNode?: NodeID;
}

export const emptyColoringContext = {
    coloredEdges: new Map(),
    coloredNodes: new Map(),
}

export const ColoringCtx = createContext<ColoringContext>(emptyColoringContext);

export const useEdgeColor = (edge: EdgeBase) => {
    const ctx = useContext(ColoringCtx);
    if (ctx.currentEdge === edgeID(edge)) return "lightgreen";
    return ctx.coloredEdges.get(edgeID(edge)) ?? "var(--secondary)";
}

export const useNodeColor = (node: NodeBase) => {
    const ctx = useContext(ColoringCtx);
    if (ctx.currentNode === nodeID(node)) return "lightgreen";
    return ctx.coloredNodes.get(nodeID(node)) ?? "var(--secondary)";
}
