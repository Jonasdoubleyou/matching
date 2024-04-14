// --------------- Graph -------------------

export interface NodeBase {
    id: number;
}

export function isNode(it: any): it is NodeBase {
    return "id" in it;
}

export interface EdgeBase<Node = NodeBase>  {
    from: Node;
    to: Node;
    weight: number;
}

export function isEdge(it: any): it is EdgeBase {
    return "from" in it && "to" in it && "weight" in it;
}

export interface Graph<Node = NodeBase, Edge = EdgeBase<Node>> {
    nodes: Node[];
    edges: Edge[];
}

export interface ReadonlyGraph<Node = NodeBase, Edge = EdgeBase<Node>> {
    nodes: readonly Readonly<Node>[];
    edges: readonly Readonly<Edge>[];
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

        if (usedNodes.has(edge.from)) {
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
                return { matching, steps };
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

export function run(input: ReadonlyGraph, matcher: Matcher): RunResult {
    const iterator = matcher(input);

    let steps = 0;
    while(steps < MAX_STEPS) {
        const { value: matching, done } = iterator.next();
        steps += 1;

        if (done) {
            console.log(`Finished matching after ${steps} Steps`, { matching });
            return { matching, steps };
        }
    }

    throw new Error(`Matching exceeded ${MAX_STEPS}`);
}