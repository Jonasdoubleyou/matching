import { EdgeBase } from "../../algo";
import { useEdgeColor } from "../Coloring";

export function StandaloneEdgeUI({ edge }: { edge: EdgeBase }) {
    const color = useEdgeColor(edge);
    const style = { color, borderColor: color };

    return <div className="data-edge" style={style}>
            <div className="data-edge-node" style={style}>
                {edge.from.id}
            </div>
            <div className="data-edge-arrow" style={style}>
                {edge.weight}
            </div>
            <div className="data-edge-node" style={style}>
                {edge.to.id}
            </div>
    </div>;
}