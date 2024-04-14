import { ReactElement, useMemo, useRef, useState } from "react";
import { Color, EdgeBase, NodeBase, Visualizer, isEdge, isNode } from "../algo";

import "./Visualizer.css";

type DataMap = Map<string, any>;

interface VisualizerState {
    coloredEdges: Map<EdgeBase, Color>;
    coloredNodes: Map<NodeBase, Color>;
    
    currentEdge?: EdgeBase;
    currentNode?: NodeBase;

    step?: string;
    message?: string;

    data: DataMap;
}

const MAX_UNDO_STATES = 10;

export const useVisualizer = () => {
    const activeState = useRef<VisualizerState>({
        coloredEdges: new Map(),
        coloredNodes: new Map(),
        data: new Map(),
    });

    const [states, setStates] = useState<VisualizerState[]>([]);
    
    const visualizer: Visualizer = useMemo(() => {
        function commit() {
            const active = activeState.current;
            activeState.current = {
                ...active,
                message: undefined,
                currentEdge: undefined,
                currentNode: undefined
            };

            // The active state will be kept and modified,
            // thus do a deep clone here
            const frozenActive = structuredClone(active);
            Object.freeze(frozenActive);
    
            console.log("Comitting visualizer state", frozenActive);

            setStates(prev => [...prev.slice(-MAX_UNDO_STATES), frozenActive]);
        }

        function step(name: string) {
            console.log('step', name);
            activeState.current.step = name;
        }

        function message(msg: string) {
            console.log('message', msg);
            activeState.current.message = msg;
        }

        function data(name: string, data: any) {
            console.log('data', name, data);
            activeState.current.data.set(name, data);
        }

        function currentEdge(edge: EdgeBase) {
            console.log('currentEdge', edge);
            activeState.current.currentEdge = edge;
        }

        function currentNode(node: NodeBase) {
            console.log('currentNode', node);
            activeState.current.currentNode = node;
        }

        function pickEdge(edge: EdgeBase, color: Color) {
            console.log('pickEdge', edge, color);
            activeState.current.coloredEdges.set(edge, color);
        }

        function pickNode(node: NodeBase, color: Color) {
            console.log('pickNode', node, color);
            activeState.current.coloredNodes.set(node, color);
        }

        return {
            step,
            message,
            data,
            commit,
            currentEdge,
            currentNode,
            pickEdge,
            pickNode
        };
    }, [activeState, setStates]);

    return {
        states,
        visualizer,
    }
};

function DataEntry({ name, children }: React.PropsWithChildren<{ name: string}>) {
    return <div className="data-entry">
        <div className="data-entry-name">{name}</div>
        <div className="data-entry-value">
            {children}
        </div>
    </div>;
}

function EmptySet() {
    return <div>
        ∅
    </div>
}

function visualizeValue(value: any) {
    if (isNode(value)) {
        return <div className="data-node">
            {value.id}
        </div>;
    }

    if (isEdge(value)) {
        return <div className="data-edge">
            <div className="data-edge-node">
                {value.from.id}
            </div>
            <div className="data-edge-arrow">
                {value.weight}
            </div>
            <div className="data-edge-node">
                {value.to.id}
            </div>
        </div>;
    }

    return value;
}

function SetUI({ set }: { set: Set<any> }) {
    return <div className="data-set">
        {[...set.values()].map(visualizeValue)}
    </div>
}

function MapUI({ map }: { map: Map<any, any> }) {
    return <div className="data-map">
        {[...map.entries()].map(([key, value]) => <div className="data-map-entry">
            <div className="data-map-key">
                {visualizeValue(key)}
            </div>
            <div className="data-map-value">
                {visualizeValue(value)}
            </div>
        </div>)}
    </div>;
}

function ArrayUI({ array }: { array: any[] }) {
    return <div className="data-array">
        {array.map((value, index) => <div className="data-array-entry">
            <div className="data-array-index">
                {index}
            </div>
            <div className="data-array-value">
                {visualizeValue(value)}
            </div>
        </div>)}
    </div>;
}

export function VisualizeUI({ state }: { state: VisualizerState }) {
    const graphs: ReactElement[] = [];

    for (const [name, value] of state.data.entries()) {
        if (typeof value === "object") {
            if (value instanceof Set) {
                graphs.push(<DataEntry name={name}>
                        {value.size ? <SetUI set={value} /> : <EmptySet />}
                </DataEntry>); 
            } else if (value instanceof Map) {
                graphs.push(<DataEntry name={name}>
                    {value.size ? <MapUI map={value} /> : <EmptySet />}
                </DataEntry>);
            } else if(Array.isArray(value)) {
                graphs.push(<DataEntry name={name}>
                    <ArrayUI array={value} />
                </DataEntry>);    
            } else {
                graphs.push(<DataEntry name={name}>
                    Unknown Object
                </DataEntry>);
            }
        } else {
            graphs.push(<DataEntry name={name}>
                Unknown Value
            </DataEntry>);
        }
    }

    return <div className="data-entries">{graphs}</div>
} 