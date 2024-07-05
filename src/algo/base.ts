// --------------- Graph -------------------

export interface NodeBase {
    id: number;
}

export interface EdgeBase<Node = NodeBase>  {
    from: Node;
    to: Node;
    weight: number;
}

export interface Graph<Node = NodeBase, Edge = EdgeBase<Node>> {
    nodes: Node[];
    edges: Edge[];
}

export interface ReadonlyGraph<Node = NodeBase, Edge = EdgeBase<Node>> {
    nodes: readonly Readonly<Node>[];
    edges: readonly Readonly<Edge>[];
}

export function isNode(it: any): it is NodeBase {
    return typeof it === "object" && it !== null && "id" in it;
}

export function sameNode(a: NodeBase, b: NodeBase) {
    return a.id === b.id;
}


export function isEdge(it: any): it is EdgeBase {
    return typeof it === "object" && it !== null && "from" in it && "to" in it;
}

export function sameEdge(a: EdgeBase, b: EdgeBase) {
    return sameNode(a.from, b.from) && sameNode(a.to, b.to) && a.weight === b.weight;
}



export type EdgeID = string;
export function edgeID(edge: EdgeBase): EdgeID {
    const a = nodeID(edge.from);
    const b = nodeID(edge.to);
    return a > b ? a + "/" + b : b + "/" + a;
}

export type NodeID = string;
export function nodeID(node: NodeBase): NodeID {
    return `${node.id}`;
}

// ----------------- Matching Algorithm -------------

export type Color = "blue" | "green" | "red";

export interface Visualizer {
    step(name: string): void;
    message(name: string): void;

    data(name: string, data: any): void;

    // Highlight nodes in the input Graph
    currentEdge(edge: EdgeBase): void;
    currentNode(node: NodeBase): void;

    pickEdge(edge: EdgeBase, color: Color): void;
    pickNode(edge: NodeBase, color: Color): void;

    removeHighlighting(): void;

    commit(): void;
}

export type Matching<Edge = EdgeBase> = Readonly<Edge>[];
export type ReadonlyMatching<Edge = EdgeBase> = readonly Readonly<Edge>[];
export type Matcher<Node = NodeBase, Edge = EdgeBase<Node>> = (input: ReadonlyGraph<Node, Edge>, visualize?: Visualizer) => Generator<void, Matching>;

// ---------------------- Utilities ---------------------------------------

export function verifyMatching(input: ReadonlyGraph, output: ReadonlyMatching) {
    const usedNodes = new Set<NodeBase>();

    for (const edge of output) {
        if (usedNodes.has(edge.from)) {
            throw new Error(`Duplicate use of ${edge.from.id}`);
        }

        if (usedNodes.has(edge.to)) {
            throw new Error(`Duplicate use of ${edge.from.id}`);
        }

        usedNodes.add(edge.from);
        usedNodes.add(edge.to);
    }
}

export function getScore(output: ReadonlyMatching) {
    return output.reduce((sum, edge) => sum + edge.weight, 0);
}

// ---------------------- Runner ---------------------------------------

export interface RunResult {
    matching: Matching;
    steps: number;
    runtime?: number;
    score: number;
}

export interface CancellationToken {
    cancel?: () => void;
};

export const WAS_CANCELLED = Symbol(); 

export async function runAsync(input: ReadonlyGraph, matcher: Matcher, cancellation: CancellationToken, visualizer?: Visualizer, bulkSteps: number = 1000, stepTime = 1): Promise<RunResult> {
    const iterator = matcher(input, visualizer);

    let steps = 0;
    while(true) {
        let end = steps + bulkSteps;
        while (steps < end) {
            const { value: matching, done } = iterator.next();
            steps += 1;

            if (done) {
                console.log(`Finished matching after ${steps} Steps`, { matching });
                visualizer?.commit();
                verifyMatching(input, matching);
                return { matching, steps, score: getScore(matching) };
            }
        }

        console.log(`Yielding after ${steps} Steps`);
        visualizer?.commit();

        await new Promise((res, rej) => {
            const id = setTimeout(res, stepTime);
            cancellation.cancel = () => {
                clearTimeout(id);
                rej(WAS_CANCELLED);
            };
        });
    }
}

const MAX_STEPS = 100_000_000;
const MAX_YIELD_STEPS = 100_000;

// Run the matching as fast as possible, but yield once in a while to allow the runtime
// to schedule other tasks inbetween, to keep the running process responsive
export async function run(input: ReadonlyGraph, matcher: Matcher): Promise<RunResult> {
    const iterator = matcher(input);
    let runtime = 0;

    let steps = 0;
    while(steps < MAX_STEPS) {
        let matching: any;
        let done: boolean | undefined = false;

        const start = performance.now();
        do {
            ({ value: matching, done } = iterator.next());
            steps += 1;
        } while (!done && ((steps % MAX_YIELD_STEPS) !== 0));
        const duration = performance.now() - start;
        runtime += duration;


        if (done) {
            console.log(`Finished matching after ${steps} Steps`, { matching });
            verifyMatching(input, matching);
            return { matching, steps, runtime, score: getScore(matching) };
        }

        console.log(`Deferring matching after ${steps} steps, runtime ${runtime.toFixed(2)}ms`);
        await new Promise(res => setTimeout(res, 0));
    }

    throw new Error(`Matching exceeded ${MAX_STEPS}`);
}