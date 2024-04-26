import { NodeBase } from "../../algo";
import { useNodeColor } from "../Coloring";

export function StandaloneNodeUI({ node }: { node: NodeBase }) {
    const color = useNodeColor(node);

    return <div className="data-node" style={{ color, borderColor: color }}>
        {node.id}
    </div>;
}
