import { ReactElement, createContext, useContext, useMemo, useRef, useState } from "react";
import { Color, ColorLegend, EdgeBase, EdgeID, NodeBase, Visualizer, edgeID, isEdge, isNode, nodeID } from "../algo";
import { ColoringContext, ColoringCtx, emptyColoringContext } from "./Coloring";
import { StandaloneNodeUI } from "./graph/StandaloneNode";
import { StandaloneEdgeUI } from "./graph/StandaloneEdge";

import "./Visualizer.css";

type DataMap = Map<string, any>;

interface DataContext {
    step?: string;
    message?: string;

    data: DataMap;
}

interface ImmutableContext {
    mappings: Map<string, (data: any) => any>;
}

const emptyDataContext = {
    data: new Map()
};

const DataCtx = createContext<DataContext>(emptyDataContext);
const ImmutableCtx = createContext<ImmutableContext>({
    mappings: new Map()
});

interface VisualizerState extends ColoringContext, DataContext {}

const MAX_UNDO_STATES = 100;

export function useVisualizer(): { states: VisualizerState[], immutableContext: ImmutableContext, visualizer: Visualizer } {
    const activeState = useRef<VisualizerState>({
        coloredEdges: new Map(),
        coloredNodes: new Map(),
        data: new Map(),
    });
    const immutableState = useRef<ImmutableContext>({
        mappings: new Map()
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

        function mapData(name: string, mapping: (data: any) => any) {
            immutableState.current.mappings.set(name, mapping);
        }

        function currentEdge(edge: EdgeBase | null) {
            console.log('currentEdge', edge);
            if (edge)
                activeState.current.currentEdge = edgeID(edge);
            else
                activeState.current.currentEdge = undefined;
        }

        function currentNode(node: NodeBase | null) {
            console.log('currentNode', node);
            if (node)
                activeState.current.currentNode = nodeID(node);
            else
                activeState.current.currentNode = undefined;
        }

        function pickEdge(edge: EdgeBase, color: Color | null) {
            console.log('pickEdge', edge, color);
            if (color)
                activeState.current.coloredEdges.set(edgeID(edge), color);
            else
                activeState.current.coloredEdges.delete(edgeID(edge));
        }

        function pickNode(node: NodeBase, color: Color | null) {
            console.log('pickNode', node, color);
            if (color)
                activeState.current.coloredNodes.set(nodeID(node), color);
            else
                activeState.current.coloredNodes.delete(nodeID(node));

        }

        function removeHighlighting() {
            activeState.current.coloredEdges.clear();
            activeState.current.coloredNodes.clear();
        }

        function addLegend(legend: ColorLegend) {
            activeState.current.legend = legend;
        }


        return {
            step,
            message,
            data,
            mapData,
            commit,
            currentEdge,
            currentNode,
            pickEdge,
            pickNode,
            removeHighlighting,
            addLegend,
            immutableState
        };
    }, [activeState, setStates]);

    return {
        states,
        immutableContext: immutableState.current,
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
        return <StandaloneNodeUI node={value} />
    }

    if (isEdge(value)) {
        return <StandaloneEdgeUI edge={value} />
    }

    if (Array.isArray(value)) {
        return <ArrayUI array={value} />
    }

    return value;
}

function SetUI({ set }: { set: Set<any> }) {
    return <div className="data-set">
        {[...set.values()].map(value => <div className="data-set-entry">
            → {visualizeValue(value)}
        </div>)}
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

export function VisualizeContext({ state, immutableContext, children }: React.PropsWithChildren<{ state: VisualizerState, immutableContext: ImmutableContext }>) {
    return <DataCtx.Provider value={state ?? emptyDataContext}>
        <ImmutableCtx.Provider value={immutableContext}>
            <ColoringCtx.Provider value={state ?? emptyColoringContext}>
                {children}
            </ColoringCtx.Provider>
        </ImmutableCtx.Provider>
    </DataCtx.Provider>;
}

export function StateUI() {
    const { data } = useContext(DataCtx);
    const { mappings } = useContext(ImmutableCtx);

    const mappedData = useMemo(() => {
        return [...data.entries()].map(([name, it]) => 
            [name, (mappings.has(name) ? mappings.get(name)!(it) : it)]);
    }, [data, mappings]);

    const graphs: ReactElement[] = [];

    for (let [name, value] of mappedData) {
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

    return <div className="data-entries">{graphs}</div>;
} 