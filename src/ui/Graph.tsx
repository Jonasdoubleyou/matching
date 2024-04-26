import { EdgeBase, NodeBase, ReadonlyGraph } from "../algo";
import { Group } from '@visx/group';

function NodeUI({ node, x, y, size }: { node: Readonly<NodeBase>, x: number, y: number, size: number }) {
    return (
        <Group top={y + size / 2} left={x + size / 2}>
            <circle r={size / 2 - 3} stroke={"white"} strokeWidth={"3px"} />
            <text
                dy=".33em"
                fontSize={9}
                fontFamily="Arial"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
                fill={"white"}
            >
            {node.id}
            </text>
        </Group>
    );
}

function EdgeUI({ edge, from, to }: { edge: Readonly<EdgeBase>, from: { x: number, y: number }, to: { x: number, y: number }}) {
    const offsetX = to.x - from.x;
    const offsetY = to.y - from.y;
    const offsetLength = Math.sqrt(offsetX ** 2 + offsetY ** 2);

    // Move slightly apart by 90 degrees, so that the text is not on the edge line
     let middleX = from.x + offsetX * 0.5 - (offsetY / offsetLength) * 20;
    let middleY = from.y + offsetY * 0.5 + (offsetX / offsetLength) * 20 + 10 /* half of height */;
    
    return <>
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="white" strokeWidth="3px"  />
        <text x={middleX} y={middleY} fill="white">{edge.weight}</text>
    </>
}

function NodeCircle({ nodes, edges, size, x, y }: { nodes: readonly Readonly<NodeBase>[], edges: readonly Readonly<EdgeBase>[], size: number, x: number, y: number }) {
    const nodeSize = Math.min(40, size / nodes.length);
    const maxRadius = size / 2 - nodeSize / 2;
    const offsetX = x + maxRadius;
    const offsetY = y + maxRadius;
    const radius = Math.min(maxRadius, nodes.length / 2 * 50);

    function nodePos(index: number) {
        const rotation = index / nodes.length * 2 * Math.PI;
        const x = offsetX + radius * Math.sin(rotation);
        const y = offsetY + radius * Math.cos(rotation);
        return { x, y};    
    }

    return <>
        {edges.map((edge) => {
            const from = nodePos(nodes.indexOf(edge.from));
            from.x += nodeSize / 2;
            from.y += nodeSize / 2;

            const to = nodePos(nodes.indexOf(edge.to));
            to.x += nodeSize / 2;
            to.y += nodeSize / 2;

            return <EdgeUI edge={edge} from={from} to={to} />;
        })}
        {nodes.map((node, index) => {
            const { x, y } = nodePos(index);
            return <NodeUI node={node} x={x} y={y} size={nodeSize} />})}
        
    </>
}

export function GraphUI({ graph }: { graph: ReadonlyGraph }) {
    const width = 600;
    const height = 600;

    return <svg width={width} height={height}>
        <NodeCircle nodes={graph.nodes} edges={graph.edges} x={0} y={0} size={width} />
    </svg>
}