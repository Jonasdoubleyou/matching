import { assert } from "../util/assert";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer } from "./base";

/* Blossom Matching (optimal, O(n ** 3))
 * 
 * Implementation adapted from https://github.com/graph-algorithm/maximum-matching, 
 * which is itself an adaption from http://jorisvr.nl/maximummatching.html
 * All credit for the implementation goes to Joris van Rantwijk [http://jorisvr.nl].
 * 
 * The algorithm is taken from "Efficient Algorithms for Finding Maximum
 *  Matching in Graphs" by Zvi Galil, ACM Computing Surveys, 1986.
 * It is based on the "blossom" method for finding augmenting paths and
 * the "primal-dual" method for finding a matching of maximum weight, both
 * due to Jack Edmonds.
 * Some ideas came from "Implementation of algorithms for maximum matching
 * on non-bipartite graphs" by H.J. Gabow, Standford Ph.D. thesis, 1973.
 */
export const BlossomMatcher: Matcher = function* GreedyMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    // ---------- Compress Nodes & Edges ----------------

    // Instead of Maps the implementation uses vectors to store values per-node and per-edge,
    // and thus refers to as nodes through their index [0, nodeCount). As we support arbitrary input structures,
    // we here need to remap Nodes to such an id.
    // (We do not visualize it as it is an implementation detail of this particular implementation)

    // the inverse of input.nodes (which maps numbers to nodes)
    const nodeIds = new Map<NodeBase, VertexID>();
    for (const [id, node] of input.nodes.entries())
        nodeIds.set(node, id as VertexID);

    // Edges as triple [source node id, target node id, weight]
    const edges: Edge[] = [];

    // Maps node pairs to the edge that connects them,
    // The blossom algorithm produces [source node, target node] tuples that need to be remapped later to 
    // the input edges
    const edgesByNodes = new Map<string, EdgeBase>();

    for (const edge of input.edges) {
        const { from, to, weight } = edge;
        const fromID = nodeIds.get(from)!;
        const toID = nodeIds.get(to)!;

        const compressedEdge = [fromID, toID, weight] as const;
        edges.push(compressedEdge);
        edgesByNodes.set(fromID + "/" + toID, edge);
    }

    // ---------------- Run ----------------------------------

    // Run the actual algorithm:
    const resultMates = maxWeightMatching(edges);
    console.log("result", resultMates);

    // ---------------- Decompress Result -------------------
    const matching: Matching = [];
    const inMatching = new Set<VertexID>();

    // Remap the output structure to a Matching of our interface
    for (const [from, to] of resultMates) {
        if (to == NoVertex) continue;

        // The "mates" structure maps in both directions 1 -> 2, 2 -> 1,
        // thus duplicates need to be excluded here
        if (inMatching.has(from) || inMatching.has(to)) continue;
        inMatching.add(from);
        inMatching.add(to);

        const decompressedEdge = edgesByNodes.get(from + "/" + to) ?? edgesByNodes.get(to + "/" + from);
        assert(decompressedEdge);

        matching.push(decompressedEdge!);
    }
    return matching;
}


// Vertices are referred to through VertexIDs in [0, vertexCount)
// -1 is used as a default value for "no vertex"
// IDs >= vertexCount are used for virtual nodes (= blossoms)
// As the number of blossoms is bound to the number of vertices,
// blossomIDs are in the range [vertexCount, vertexCount)
type VertexID = number & { _isVertexID: true };
const NoVertex: VertexID = -1 as VertexID;

function isBlossom(context: BlossomContext, id: VertexID) {
    return id >= context.nvertex;
}

type Weight = number;
type Edge = readonly [VertexID, VertexID, Weight];

// EdgeIDs are in [0, edgeCount), analogous to VertexIDs
type EdgeID = number & { _isEdgeID: true };
const NoEdge: EdgeID = -1 as EdgeID;

// ------------ Endpoints --------------------
// EndpointID are in [0, edgeCount * 2), if EdgeID k refers to an edge {a, b},
// then EndpointID k * 2 refers to a and k * 2 + 1 refers to b
// By storing edges as endpoints, edges can be remapped
type EndpointID = number & { _isEndpointID: true };
const NoEndpoint = -1 as EndpointID;
type Endpoints = { [endpoint: EndpointID]: VertexID };

function edgeDepartingEndpointID(edgeId: EdgeID): EndpointID {
    return (edgeId * 2) as EndpointID;
}

function edgeArrivingEndpointID(edgeId: EdgeID): EndpointID {
    return (edgeId * 2 + 1) as EndpointID;
}

function endpointToEdgeID(endpointID: EndpointID): EdgeID {
    return Math.floor(endpointID / 2) as EdgeID;
}

function followEdge(from: EndpointID): EndpointID {
    return (from ^ 1) as EndpointID;
}

function endpoints(edges: Edge[]): Endpoints {
    const endpoints: VertexID[] = [];
    for (const edge of edges) {
        endpoints.push(edge[0], edge[1]);
    }

    return endpoints;
}

// ---------- Neighbours -------------------
// Navigate from a Vertex to its neighbours, endpointIDs can be looked up to vertices
type Neighbours = { [from: VertexID]: EndpointID[] };

function neighbours(nvertex: VertexID, edges: Edge[]): Neighbours {
    const neighbend: EndpointID[][] = [];

    for (let i = 0; i < nvertex; ++i) neighbend.push([]);

    for (let k = 0; k < edges.length; ++k) {
        const i = edges[k][0];
        const j = edges[k][1];
        neighbend[i].push(edgeArrivingEndpointID(k as EdgeID));
        neighbend[j].push(edgeDepartingEndpointID(k as EdgeID));
    }

    return neighbend;
}

// Maps Blossoms to their children vertices (which also might be blossoms)
type BlossomChilds = { [blossomID: VertexID]: (VertexID[] | null) };

// Resolves a blossom vertex (bv) to all departing edges from the blossom
function* blossomEdges(nvertex: VertexID, blossomchilds: BlossomChilds, neighbours: Neighbours, bv: VertexID): Generator<EdgeID> {
    for (const v of blossomLeaves(nvertex, blossomchilds, bv)) {
        for (const p of neighbours[v]) yield endpointToEdgeID(p);
    }
}

// Resolves (nested) blossoms to the underlying vertices
function* blossomLeaves(nvertex: VertexID, blossomchilds: BlossomChilds, b: VertexID): Generator<VertexID> {
    if (b < nvertex) { // non-blossom vertex
        yield b;
        return;
    }

    const queue = blossomchilds[b]!.slice();
    while (queue.length > 0) {
        const b = queue.pop()!;
        if (b < nvertex) yield b; // non-blossom vertex
        else for (const t of blossomchilds[b]!) queue.push(t);
    }
}


// --------- Utilities --------------
// Returns the minimum value of array a in [i, j)
function min(a: number[], i: number, j: number) {
    let o = a[i];
    for (++i; i < j; ++i) if (a[i] < o) o = a[i];
    return o;
}

// Rotates a inplace by n elements
function rotate<T>(a: T[], n: number) {
    const head = a.splice(0, n);
    for (let i = 0; i < n; ++i) {
        a.push(head[i]);
    }
}


// ------------------ Blossom Context ------------------------
// The runtime context of the blossom algorithm

enum Label {
    CLEARED = -1,
    NO_LABEL = 0,
    S_VERTEX = 1,
    T_VERTEX = 2,
    BREADCRUMB = 5
};

type Mates = { [from: VertexID]: EndpointID; };
type Labels = { [of: VertexID]: Label } & Label[];
type BlossomMap<To> = { [vertex: VertexID]: To; };
type BestEdges = { [blossom: VertexID]: (EdgeID[] | null) } & (EdgeID[] | null)[];

interface BlossomContext {
    readonly nvertex: VertexID;
    readonly maxweight: number;

    readonly edges: Edge[];

    // If p is an edge endpoint,
    // endpoint[p] is the vertex to which endpoint p is attached.
    // Not modified by the algorithm.	
    endpoint: Endpoints;

    // If v is a vertex,
    // neighbend[v] is the list of remote endpoints of the edges attached to v.
    // Not modified by the algorithm.	
    neighbend: Neighbours;

    // If v is a vertex,
    // mate[v] is the remote endpoint of its matched edge, or -1 if it is single
    // (i.e. endpoint[mate[v]] is v's partner vertex).
    // Initially all vertices are single; updated during augmentation.	
    mate: Mates;

    // If v is a vertex,
    // inblossom[v] is the top-level blossom to which v belongs.
    // If v is a top-level vertex, v is itthis a blossom (a trivial blossom)
    // and inblossom[v] === v.
    // Initially all vertices are top-level trivial blossoms.
    inblossom: BlossomMap<VertexID>;

    // If b is a sub-blossom,
    // blossomparent[b] is its immediate parent (sub-)blossom.
    // If b is a top-level blossom, blossomparent[b] is -1.	
    blossomparent: BlossomMap<VertexID>;

    // If b is a non-trivial (sub-)blossom,
    // blossomchilds[b] is an ordered list of its sub-blossoms, starting with
    // the base and going round the blossom.	
    blossomchilds: BlossomChilds;

    // If b is a (sub-)blossom,
    // blossombase[b] is its base VERTEX (i.e. recursive sub-blossom).	
    blossombase: BlossomMap<VertexID>;

    // If b is a top-level blossom,
    // label[b] is 0 if b is unlabeled (free);
    //             1 if b is an S-vertex/blossom;
    //             2 if b is a T-vertex/blossom.
    // The label of a vertex is found by looking at the label of its
    // top-level containing blossom.
    // If v is a vertex inside a T-blossom,
    // label[v] is 2 iff v is reachable from an S-vertex outside the blossom.
    // Labels are assigned during a stage and reset after each augmentation.
    label: Labels;

    // If b is a labeled top-level blossom,
    // labelend[b] is the remote endpoint of the edge through which b obtained
    // its label, or -1 if b's base vertex is single.
    // If v is a vertex inside a T-blossom and label[v] === 2,
    // labelend[v] is the remote endpoint of the edge through which v is
    // reachable from outside the blossom.
    labelend: BlossomMap<EndpointID>;

    // If b is a non-trivial (sub-)blossom,
    // blossomendps[b] is a list of endpoints on its connecting edges,
    // such that blossomendps[b][i] is the local endpoint of blossomchilds[b][i]
    // on the edge that connects it to blossomchilds[b][wrap(i+1)].
    blossomendps: BlossomMap<(EndpointID[] | null)>;

    // If v is a free vertex (or an unreached vertex inside a T-blossom),
    // bestedge[v] is the edge to an S-vertex with least slack,
    // or -1 if there is no such edge.
    // If b is a (possibly trivial) top-level S-blossom,
    // bestedge[b] is the least-slack edge to a different S-blossom,
    // or -1 if there is no such edge.
    // This is used for efficient computation of delta2 and delta3.
    bestedge: EdgeID[];

    // If b is a non-trivial top-level S-blossom,
    // blossombestedges[b] is a list of least-slack edges to neighbouring
    // S-blossoms, or null if no such list has been computed yet.
    // This is used for efficient computation of delta3.
    blossombestedges: BestEdges;

    // List of currently unused blossom numbers [nvertex, nvertex * 2)
    unusedblossoms: VertexID[];

    // If v is a vertex,
    // dualvar[v] = 2 * u(v) where u(v) is the v's variable in the dual
    // optimization problem (multiplication by two ensures integer values
    // throughout the algorithm if all edge weights are integers).
    // If b is a non-trivial blossom,
    // dualvar[b] = z(b) where z(b) is b's variable in the dual optimization
    // problem.	
    dualvar: { [it: VertexID]: number } & number[];

    // If allowedge[k] is true, edge k has zero slack in the optimization
    // problem; if allowedge[k] is false, the edge's slack may or may not
    // be zero.	
    allowedge: { [edge: EdgeID]: boolean } & boolean[];
}

function* allEdges(context: BlossomContext): Generator<EdgeID> {
    for (let i = 0; i < context.edges.length; i++)
        yield i as EdgeID;
}

function* allVertices(context: BlossomContext): Generator<VertexID> {
    for (let i = 0; i < context.nvertex; i++)
        yield i as VertexID;
}

function* allBlossoms(context: BlossomContext): Generator<VertexID> {
    for (let i = context.nvertex; i < context.nvertex * 2; i++)
        yield i as VertexID;
}

function* allVerticesAndBlossoms(context: BlossomContext): Generator<VertexID> {
    for (let i = 0; i < context.nvertex * 2; i++)
        yield i as VertexID;
}

function buildContext(edges: Edge[]): BlossomContext {
    // Count vertices + find the maximum edge weight.
    const nedge = edges.length;
    let nvertex: VertexID = 0 as VertexID;
    let maxweight = 0;

    let length = nedge;
    while (length--) {
        const i = edges[length][0];
        const j = edges[length][1];
        const w = edges[length][2];

        assert(i >= 0 && j >= 0 && i !== j);
        if (i >= nvertex) nvertex = (i + 1) as VertexID;
        if (j >= nvertex) nvertex = (j + 1) as VertexID;

        maxweight = Math.max(maxweight, w);
    }



    const endpoint = endpoints(edges);
    const neighbend = neighbours(nvertex, edges);

    const mate = new Array(nvertex).fill(NoVertex);
    const label = new Array(2 * nvertex).fill(0);

    const labelend = new Array(2 * nvertex).fill(NoVertex);

    const inblossom = new Array(nvertex);
    for (let i = 0; i < nvertex; ++i) inblossom[i] = i;

    const blossomparent = new Array(2 * nvertex).fill(NoVertex);

    const blossomchilds = new Array(2 * nvertex).fill(null);

    const blossombase = new Array(2 * nvertex);
    for (let i = 0; i < nvertex; ++i) blossombase[i] = i;
    blossombase.fill(NoVertex, nvertex, 2 * nvertex);

    const blossomendps = new Array(2 * nvertex).fill(null);

    const bestedge = new Array(2 * nvertex).fill(NoEdge);

    const blossombestedges = new Array(2 * nvertex).fill(null);

    const unusedblossoms = new Array(nvertex);
    for (let i = 0; i < nvertex; ++i) unusedblossoms[i] = nvertex + i;

    const dualvar = new Array(2 * nvertex);
    dualvar.fill(maxweight, 0, nvertex);
    dualvar.fill(0, nvertex, 2 * nvertex);

    const allowedge = new Array(nedge).fill(false);

    return {
        edges,
        nvertex,
        maxweight,
        endpoint,
        mate,
        neighbend,
        bestedge,
        blossombase,
        blossombestedges,
        blossomchilds,
        blossomendps,
        blossomparent,
        dualvar,
        inblossom,
        label,
        labelend,
        unusedblossoms,
        allowedge
    }
}

// Return 2 * slack of edge k (does not work inside blossoms).
function slack(context: BlossomContext, k: EdgeID) {
    const [i, j, wt] = context.edges[k];
    return context.dualvar[i] + context.dualvar[j] - 2 * wt;
}


// --------- Consistency Checks --------
// Turn on intermediate result checks to verify correctness of the algorithm
// Useful during development, but significantly slows down execution
const ENABLE_CHECKS = false;


// Check optimized delta2 against a trivial computation.
function checkDelta2(context: BlossomContext) {
    if (!ENABLE_CHECKS) return;

    for (const v of allVertices(context)) {
        if (context.label[context.inblossom[v]] === 0) {
            let bd = null;
            let bk = NoEdge;
            for (const p of context.neighbend[v]) {
                const k = endpointToEdgeID(p);
                const w = context.endpoint[p];
                if (context.label[context.inblossom[w]] === Label.S_VERTEX) {
                    const d = slack(context, k);
                    if (bk === NoEdge || d < bd!) {
                        bk = k;
                        bd = d;
                    }
                }
            }

            assert(
                (bk === NoEdge && context.bestedge[v] === NoEdge) ||
                (context.bestedge[v] !== NoEdge && bd === slack(context, context.bestedge[v])),
            );
        }
    }
};

// Check optimized delta3 against a trivial computation.
function checkDelta3(context: BlossomContext) {
    if (!ENABLE_CHECKS) return;

    let bk = NoEdge;
    let bd = null;
    let tbk = NoEdge;
    let tbd = null;
    for (const b of allVerticesAndBlossoms(context)) {
        if (context.blossomparent[b] === NoVertex && context.label[b] === Label.S_VERTEX) {
            for (const v of blossomLeaves(context.nvertex, context.blossomchilds, b)) {
                for (const p of context.neighbend[v]) {
                    const k = endpointToEdgeID(p);
                    const w = context.endpoint[p];
                    if (context.inblossom[w] !== b && context.label[context.inblossom[w]] === 1) {
                        const d = slack(context, k);
                        if (bk === NoEdge || d < bd!) {
                            bk = k;
                            bd = d;
                        }
                    }
                }
            }

            if (context.bestedge[b] !== NoEdge) {
                const i = context.edges[context.bestedge[b]][0];
                const j = context.edges[context.bestedge[b]][1];

                assert(context.inblossom[i] === b || context.inblossom[j] === b);
                assert(context.inblossom[i] !== b || context.inblossom[j] !== b);
                assert(context.label[context.inblossom[i]] === Label.S_VERTEX && context.label[context.inblossom[j]] === Label.S_VERTEX);
                if (tbk === NoEdge || slack(context, context.bestedge[b]) < tbd!) {
                    tbk = context.bestedge[b];
                    tbd = slack(context, context.bestedge[b]);
                }
            }
        }
    }

    assert(bd === tbd);
};

// Verify that the optimum solution has been reached.
function verifyOptimum(context: BlossomContext) {
    if (!ENABLE_CHECKS) return;

    let i;
    let j;
    let wt;
    let v;
    let b;
    let p;
    let k;
    let s;
    let iblossoms;
    let jblossoms;
    const vdualoffset = 0;
    // 0. all dual variables are non-negative
    assert(min(context.dualvar, 0, context.nvertex) + vdualoffset >= 0);
    assert(min(context.dualvar, context.nvertex, 2 * context.nvertex) >= 0);
    // 0. all edges have non-negative slack and
    // 1. all matched edges have zero slack;
    for (const k of allEdges(context)) {
        i = context.edges[k][0];
        j = context.edges[k][1];
        wt = context.edges[k][2];

        s = context.dualvar[i] + context.dualvar[j] - 2 * wt;
        iblossoms = [i];
        jblossoms = [j];
        while (context.blossomparent[iblossoms.at(-1)!] !== NoVertex)
            iblossoms.push(context.blossomparent[iblossoms.at(-1)!]);
        while (context.blossomparent[jblossoms.at(-1)!] !== NoVertex)
            jblossoms.push(context.blossomparent[jblossoms.at(-1)!]);
        iblossoms.reverse();
        jblossoms.reverse();
        const length = Math.min(iblossoms.length, jblossoms.length);
        for (let x = 0; x < length; ++x) {
            const bi = iblossoms[x];
            const bj = jblossoms[x];
            if (bi !== bj) break;
            s += 2 * context.dualvar[bi];
        }

        assert(s >= 0);
        if (endpointToEdgeID(context.mate[i]) === k || endpointToEdgeID(context.mate[j]) === k) {
            assert(endpointToEdgeID(context.mate[i]) === k && endpointToEdgeID(context.mate[j]) === k);
            assert(s === 0);
        }
    }

    // 2. all single vertices have zero dual value;
    for (const v of allVertices(context))
        assert(context.mate[v] >= 0 || context.dualvar[v] + vdualoffset === 0);
    // 3. all blossoms with positive dual value are full.
    for (const b of allBlossoms(context)) {
        if (context.blossombase[b] >= 0 && context.dualvar[b] > 0) {
            assert(context.blossomendps[b]!.length % 2 === 1);
            for (i = 1; i < context.blossomendps[b]!.length; i += 2) {
                p = context.blossomendps[b]![i];
                assert((+(context.mate[context.endpoint[p]] === p) ^ 1) > 0);
                assert(context.mate[context.endpoint[followEdge(p)]] === p);
            }
        }
    }
    // Ok.
};


// ----------------- Subroutines -----------------------

type Queue = VertexID[];

// -------- Label Assignment ---------
// Assign label t to the top-level blossom containing vertex w
// and record the fact that w was reached through the edge with
// remote endpoint p.
function assignLabel(queue: Queue, context: BlossomContext, w: VertexID, t: Label, p: EndpointID) {
    const b = context.inblossom[w];
    assert(context.label[w] === Label.NO_LABEL && context.label[b] === Label.NO_LABEL);
    assert(t === Label.S_VERTEX || t === Label.T_VERTEX);
    context.label[w] = t;
    context.label[b] = t;
    context.labelend[w] = p;
    context.labelend[b] = p;
    context.bestedge[w] = NoEdge;
    context.bestedge[b] = NoEdge;
    if (t === Label.S_VERTEX) {
        // B became an S-vertex/blossom; add it(s vertices) to the queue.
        for (const v of blossomLeaves(context.nvertex, context.blossomchilds, b)) {
            queue.push(v);
        }
    } else {
        // B became a T-vertex/blossom; assign label S to its mate.
        // (If b is a non-trivial blossom, its base is the only vertex
        // with an external mate.)
        const base = context.blossombase[b];
        assert(context.mate[base] >= 0);
        assignLabel(queue, context, context.endpoint[context.mate[base]], Label.S_VERTEX, followEdge(context.mate[base]));
    }
}

// ---------- Blossom Handling ------------
// Trace back from vertices v and w to discover either a new blossom
// or an augmenting path. Return the base vertex of the new blossom or -1.
function scanBlossom(context: BlossomContext, v: VertexID, w: VertexID) {
    // Trace back from v and w, placing breadcrumbs as we go.
    const path = [];
    let base = NoVertex;
    while (v !== NoVertex || w !== NoVertex) {
        // Look for a breadcrumb in v's blossom or put a new breadcrumb.
        let b = context.inblossom[v];
        if (context.label[b] === Label.BREADCRUMB) {
            base = context.blossombase[b];
            break;
        }

        assert(context.label[b] === Label.S_VERTEX);
        path.push(b);
        context.label[b] = Label.BREADCRUMB;
        // Trace one step back.
        assert(context.labelend[b] === context.mate[context.blossombase[b]]);
        if (context.labelend[b] === NoEndpoint) {
            // The base of blossom b is single; stop tracing this path.
            v = NoVertex;
        } else {
            v = context.endpoint[context.labelend[b]];
            b = context.inblossom[v];
            assert(context.label[b] === Label.T_VERTEX);
            // B is a T-blossom; trace one more step back.
            assert(context.labelend[b] >= 0);
            v = context.endpoint[context.labelend[b]];
        }

        // Swap v and w so that we alternate between both paths.
        if (w !== NoVertex) {
            const temporary_ = v;
            v = w;
            w = temporary_;
        }
    }

    // Remove breadcrumbs.
    for (const b of path) context.label[b] = Label.S_VERTEX;

    // Return base vertex, if we found one.
    return base;
}

// Construct a new blossom with given base, containing edge k which
// connects a pair of S vertices. Label the new blossom as S; set its dual
// variable to zero; relabel its T-vertices to S and add them to the queue.
function addBlossom(queue: Queue, context: BlossomContext, base: VertexID, k: EdgeID) {
    let v = context.edges[k][0];
    let w = context.edges[k][1];
    const bb = context.inblossom[base];
    let bv = context.inblossom[v];
    let bw = context.inblossom[w];
    // Create blossom.
    const b = context.unusedblossoms.pop()!;

    context.blossombase[b] = base;
    context.blossomparent[b] = NoVertex;
    context.blossomparent[bb] = b;
    // Make list of sub-blossoms and their interconnecting edge endpoints.
    const path: VertexID[] = [];
    context.blossomchilds[b] = path;
    const endps: EndpointID[] = [];
    context.blossomendps[b] = endps;
    // Trace back from v to base.
    while (bv !== bb) {
        // Add bv to the new blossom.
        context.blossomparent[bv] = b;
        path.push(bv);
        endps.push(context.labelend[bv]);
        assert(
            context.label[bv] === Label.T_VERTEX ||
            (context.label[bv] === Label.S_VERTEX && context.labelend[bv] === context.mate[context.blossombase[bv]]),
        );
        // Trace one step back.
        assert(context.labelend[bv] >= 0);
        v = context.endpoint[context.labelend[bv]];
        bv = context.inblossom[v];
    }

    // Reverse lists, add endpoint that connects the pair of S vertices.
    path.push(bb);
    path.reverse();
    endps.reverse();
    endps.push(edgeDepartingEndpointID(k));
    // Trace back from w to base.
    while (bw !== bb) {
        // Add bw to the new blossom.
        context.blossomparent[bw] = b;
        path.push(bw);
        endps.push(followEdge(context.labelend[bw]));
        assert(
            context.label[bw] === Label.T_VERTEX ||
            (context.label[bw] === Label.S_VERTEX && context.labelend[bw] === context.mate[context.blossombase[bw]]),
        );
        // Trace one step back.
        assert(context.labelend[bw] >= 0);
        w = context.endpoint[context.labelend[bw]];
        bw = context.inblossom[w];
    }

    // Set label to S.
    assert(context.label[bb] === Label.S_VERTEX);
    context.label[b] = Label.S_VERTEX;
    context.labelend[b] = context.labelend[bb];
    // Set dual variable to zero.
    context.dualvar[b] = 0;
    // Relabel vertices.
    for (const v of blossomLeaves(context.nvertex, context.blossomchilds, b)) {
        if (context.label[context.inblossom[v]] === Label.T_VERTEX) {
            // This T-vertex now turns into an S-vertex because it becomes
            // part of an S-blossom; add it to the queue.
            queue.push(v);
        }

        context.inblossom[v] = b;
    }

    // Compute blossombestedges[b].
    const bestedgeto = new Array(2 * context.nvertex).fill(NoVertex);

    const length_ = path.length;
    for (let z = 0; z < length_; ++z) {
        const bv = path[z];
        // Walk this subblossom's least-slack edges.
        let nblist: Iterable<EdgeID> | null = context.blossombestedges[bv];
        if (nblist === null) {
            // This subblossom does not have a list of least-slack edges;
            // get the information from the vertices.
            nblist = blossomEdges(context.nvertex, context.blossomchilds, context.neighbend, bv);
        }

        for (const k of nblist) {
            const [i, j] = context.edges[k];
            const bj = context.inblossom[j] === b ? context.inblossom[i] : context.inblossom[j];

            if (
                bj !== b &&
                context.label[bj] === Label.S_VERTEX &&
                (bestedgeto[bj] === NoVertex || slack(context, k) < slack(context, bestedgeto[bj]))
            ) {
                bestedgeto[bj] = k;
            }
        }

        // Forget about least-slack edges of the subblossom.
        context.blossombestedges[bv] = null;
        context.bestedge[bv] = NoEdge;
    }

    context.blossombestedges[b] = [];
    const length_2 = bestedgeto.length;
    for (let i = 0; i < length_2; ++i) {
        k = bestedgeto[i];
        if (k !== NoEdge) context.blossombestedges[b]!.push(k);
    }

    // Select bestedge[b].

    const length_3 = context.blossombestedges[b]!.length;
    if (length_3 > 0) {
        context.bestedge[b] = context.blossombestedges[b]![0];
        for (let i = 1; i < length_3; ++i) {
            k = context.blossombestedges[b]![i];
            if (slack(context, k) < slack(context, context.bestedge[b])) {
                context.bestedge[b] = k;
            }
        }
    } else context.bestedge[b] = NoEdge;
}

// Expand the given top-level blossom.
function expandBlossom(queue: Queue, context: BlossomContext, b: VertexID, endstage: boolean) {
    // Convert sub-blossoms into top-level blossoms.
    for (let i = 0; i < context.blossomchilds[b]!.length; ++i) {
        const s = context.blossomchilds[b]![i];

        context.blossomparent[s] = NoVertex;
        if (!isBlossom(context, s)) context.inblossom[s] = s;
        else if (endstage && context.dualvar[s] === 0) {
            // Recursively expand this sub-blossom.
            expandBlossom(queue, context, s, endstage);
        } else {
            for (const v of blossomLeaves(context.nvertex, context.blossomchilds, s)) {
                context.inblossom[v] = s;
            }
        }
    }

    // If we expand a T-blossom during a stage, its sub-blossoms must be
    // relabeled.
    if (!endstage && context.label[b] === Label.T_VERTEX) {
        // Start at the sub-blossom through which the expanding
        // blossom obtained its label, and relabel sub-blossoms untili
        // we reach the base.
        // Figure out through which sub-blossom the expanding blossom
        // obtained its label initially.
        assert(context.labelend[b] >= 0);
        const entrychild = context.inblossom[context.endpoint[followEdge(context.labelend[b])]];
        // Decide in which direction we will go round the blossom.
        let j = context.blossomchilds[b]!.indexOf(entrychild);
        let jstep;
        let endptrick;
        let stop;
        let base;
        if (j & 1) {
            // Start index is odd; go forward.
            jstep = 1;
            endptrick = 0;
            stop = context.blossomchilds[b]!.length;
            base = 0;
        } else {
            // Start index is even; go backward.
            jstep = -1;
            endptrick = 1;
            stop = 0;
            base = context.blossomchilds[b]!.length;
        }

        // Move along the blossom until we get to the base.
        let p = context.labelend[b];
        while (j !== stop) {
            // Relabel the T-sub-blossom.
            context.label[context.endpoint[followEdge(p)]] = 0;
            context.label[context.endpoint[(context.blossomendps[b]![j - endptrick] ^ endptrick ^ 1) as EndpointID]] = 0;
            assignLabel(queue, context, context.endpoint[followEdge(p)], Label.T_VERTEX, p);
            // Step to the next S-sub-blossom and note its forward endpoint.
            context.allowedge[endpointToEdgeID(context.blossomendps[b]![j - endptrick])] = true;
            j += jstep;
            p = (context.blossomendps[b]![j - endptrick] ^ endptrick) as EndpointID;
            // Step to the next T-sub-blossom.
            context.allowedge[endpointToEdgeID(p)] = true;
            j += jstep;
        }

        // Relabel the base T-sub-blossom WITHOUT stepping through to
        // its mate (so don't call assignLabel).
        let bv = context.blossomchilds[b]![0];
        context.label[context.endpoint[followEdge(p)]] = Label.T_VERTEX;
        context.label[bv] = Label.T_VERTEX;
        context.labelend[context.endpoint[followEdge(p)]] = p;
        context.labelend[bv] = p;
        context.bestedge[bv] = NoEdge;
        // Continue along the blossom until we get back to entrychild.
        j = base + jstep;
        while (context.blossomchilds[b]![j] !== entrychild) {
            // Examine the vertices of the sub-blossom to see whether
            // it is reachable from a neighbouring S-vertex outside the
            // expanding blossom.
            bv = context.blossomchilds[b]![j];
            if (context.label[bv] === Label.S_VERTEX) {
                // This sub-blossom just got label S through one of its
                // neighbours; leave it.
                j += jstep;
                continue;
            }

            for (const v of blossomLeaves(context.nvertex, context.blossomchilds, bv)) {
                if (context.label[v] === 0) continue;
                // If the sub-blossom contains a reachable vertex, assign
                // label T to the sub-blossom.
                assert(context.label[v] === Label.T_VERTEX);
                assert(context.inblossom[v] === bv);
                context.label[v] = 0;
                context.label[context.endpoint[context.mate[context.blossombase[bv]]]] = 0;
                assignLabel(queue, context, v, Label.T_VERTEX, context.labelend[v]);
                break;
            }

            j += jstep;
        }
    }

    // Recycle the blossom number.
    context.label[b] = Label.CLEARED;
    context.labelend[b] = NoEndpoint;
    context.blossomchilds[b] = null;
    context.blossomendps[b] = null;
    context.blossombase[b] = NoVertex;
    context.blossombestedges[b] = null;
    context.bestedge[b] = NoEdge;
    context.unusedblossoms.push(b);
}

// --------------- Augmentation ---------------
// Swap matched/unmatched edges over an alternating path through blossom b
// between vertex v and the base vertex. Keep blossom bookkeeping consistent.
function augmentBlossom(context: BlossomContext, b: VertexID, v: VertexID) {
    // Bubble up through the blossom tree from vertex v to an immediate
    // sub-blossom of b.
    let j;
    let jstep;
    let endptrick;
    let stop;
    let p: EndpointID;
    let t = v;
    while (context.blossomparent[t] !== b) t = context.blossomparent[t];
    // Recursively deal with the first sub-blossom.
    if (isBlossom(context, t)) augmentBlossom(context, t, v);
    // Decide in which direction we will go round the blossom.
    j = context.blossomchilds[b]!.indexOf(t);
    const i = j;
    const length_ = context.blossomchilds[b]!.length;
    if (i & 1) {
        // Start index is odd; go forward.
        jstep = 1;
        endptrick = 0;
        stop = length_;
    } else {
        // Start index is even; go backward.
        jstep = -1;
        endptrick = 1;
        stop = 0;
    }

    // Move along the blossom until we get to the base.
    while (j !== stop) {
        // Step to the next sub-blossom and augment it recursively.
        j += jstep;
        t = context.blossomchilds[b]![j];
        p = (context.blossomendps[b]![j - endptrick] ^ endptrick) as EndpointID;
        if (isBlossom(context, t)) augmentBlossom(context, t, context.endpoint[p]);
        // Step to the next sub-blossom and augment it recursively.
        j += jstep;
        t = context.blossomchilds[b]![Math.abs(j % length_)];
        if (isBlossom(context, t)) augmentBlossom(context, t, context.endpoint[followEdge(p)]);
        // Match the edge connecting those sub-blossoms.
        context.mate[context.endpoint[p]] = followEdge(p);
        context.mate[context.endpoint[followEdge(p)]] = p;
    }

    // Rotate the list of sub-blossoms to put the new base at the front.
    rotate(context.blossomchilds[b]!, i);
    rotate(context.blossomendps[b]!, i);
    context.blossombase[b] = context.blossombase[context.blossomchilds[b]![0]];
    assert(context.blossombase[b] === v);
};

// Swap matched/unmatched edges over an alternating path between two
// single vertices. The augmenting path runs through edge k, which
// connects a pair of S vertices.
function augmentMatching(context: BlossomContext, k: EdgeID) {
    const v = context.edges[k][0];
    const w = context.edges[k][1];

    augmentMatchingDirection(context, v, edgeArrivingEndpointID(k));
    augmentMatchingDirection(context, w, edgeDepartingEndpointID(k));
}

function augmentMatchingDirection(context: BlossomContext, s: VertexID, p: EndpointID) {
    const { nvertex, endpoint, inblossom, label, labelend, mate, blossombase } = context;
    // Match vertex s to remote endpoint p. Then trace back from s
    // until we find a single vertex, swapping matched and unmatched
    // edges as we go.
    while (true) {
        const bs = inblossom[s];
        assert(label[bs] === Label.S_VERTEX);
        assert(labelend[bs] === mate[blossombase[bs]]);
        // Augment through the S-blossom from s to base.
        if (bs >= nvertex) augmentBlossom(context, bs, s);
        // Update mate[s]
        mate[s] = p;
        // Trace one step back.
        if (labelend[bs] === NoEndpoint) {
            // Reached single vertex; stop.
            break;
        }

        const t = endpoint[labelend[bs]];
        const bt = inblossom[t];
        assert(label[bt] === Label.T_VERTEX);
        // Trace one step back.
        assert(labelend[bt] >= 0);
        s = endpoint[labelend[bt]];
        const j = endpoint[followEdge(labelend[bt])];
        // Augment through the T-blossom from j to base.
        assert(blossombase[bt] === t);
        if (bt >= nvertex) augmentBlossom(context, bt, j);
        // Update mate[j]
        mate[j] = labelend[bt];
        // Keep the opposite endpoint;
        // it will be assigned to mate[s] in the next step.
        p = followEdge(labelend[bt]);
    }
};

enum DeltaType {
    NONE = -1,
    DELTA1 = 1,
    DELTA2 = 2,
    DELTA3 = 3,
    DELTA4 = 4
}

function maxWeightMatching(edges: Edge[]): [VertexID, VertexID][] {
    // Vertices are numbered 0 .. (nvertex-1).
    // Non-trivial blossoms are numbered nvertex .. (2*nvertex-1)
    //
    // Edges are numbered 0 .. (nedge-1).
    // Edge endpoints are numbered 0 .. (2*nedge-1), such that endpoints
    // (2*k) and (2*k+1) both belong to edge k.
    //
    // Many terms used in the comments (sub-blossom, T-vertex) come from
    // the paper by Galil; read the paper before reading this code.

    // Deal swiftly with empty graphs.
    if (edges.length === 0) return [];

    const context = buildContext(edges);


    // Queue of newly discovered S-vertices.
    let queue: VertexID[] = [];


    let d: number;
    let kslack: number;
    let base: VertexID;
    let deltatype: DeltaType = DeltaType.NONE;
    let delta: number;
    let deltaedge: EdgeID = NoEdge;
    let deltablossom: VertexID = NoVertex;

    // Main loop: continue until no further improvement is possible.
    for (const t of allVertices(context)) {
        // Each iteration of this loop is a "stage".
        // A stage finds an augmenting path and uses that to improve
        // the matching.

        // Remove labels from top-level blossoms/vertices.
        (context.label).fill(0);

        // Forget all about least-slack edges.
        context.bestedge.fill(NoEdge);
        (context.blossombestedges).fill(null, context.nvertex, 2 * context.nvertex);

        // Loss of labeling means that we can not be sure that currently
        // allowable edges remain allowable througout this stage.
        context.allowedge.fill(false);

        // Make queue empty.
        queue = [];

        // Label single blossoms/vertices with S and put them in the queue.
        for (const v of allVertices(context)) {
            if (context.mate[v] === NoEndpoint && context.label[context.inblossom[v]] === 0) {
                assignLabel(queue, context, v, Label.S_VERTEX, NoEndpoint);
            }
        }

        // Loop until we succeed in augmenting the matching.
        let augmented = false;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // Each iteration of this loop is a "substage".
            // A substage tries to find an augmenting path;
            // if found, the path is used to improve the matching and
            // the stage ends. If there is no augmenting path, the
            // primal-dual method is used to pump some slack out of
            // the dual variables.

            // Continue labeling until all vertices which are reachable
            // through an alternating path have got a label.
            while (queue.length > 0 && !augmented) {
                // Take an S vertex from the queue.
                const v = queue.pop()!;
                assert(context.label[context.inblossom[v]] === Label.S_VERTEX);

                // Scan its neighbours:
                const length = context.neighbend[v].length;
                for (let i = 0; i < length; ++i) {
                    const p = context.neighbend[v][i];
                    const k = endpointToEdgeID(p);
                    const w = context.endpoint[p];
                    // W is a neighbour to v
                    if (context.inblossom[v] === context.inblossom[w]) {
                        // This edge is internal to a blossom; ignore it
                        continue;
                    }

                    if (!context.allowedge[k]) {
                        kslack = slack(context, k);
                        if (kslack <= 0) {
                            // Edge k has zero slack => it is allowable
                            context.allowedge[k] = true;
                        }
                    }

                    if (context.allowedge[k]) {
                        if (context.label[context.inblossom[w]] === Label.NO_LABEL) {
                            // (C1) w is a free vertex;
                            // label w with T and label its mate with S (R12).
                            assignLabel(queue, context, w, Label.T_VERTEX, followEdge(p));
                        } else if (context.label[context.inblossom[w]] === Label.S_VERTEX) {
                            // (C2) w is an S-vertex (not in the same blossom);
                            // follow back-links to discover either an
                            // augmenting path or a new blossom.
                            base = scanBlossom(context, v, w);
                            if (base !== NoVertex) {
                                // Found a new blossom; add it to the blossom
                                // bookkeeping and turn it into an S-blossom.
                                addBlossom(queue, context, base, k);
                            } else {
                                // Found an augmenting path; augment the
                                // matching and end this stage.
                                augmentMatching(context, k);
                                augmented = true;
                                break;
                            }
                        } else if (context.label[w] === Label.NO_LABEL) {
                            // W is inside a T-blossom, but w itthis has not
                            // yet been reached from outside the blossom;
                            // mark it as reached (we need this to relabel
                            // during T-blossom expansion).
                            assert(context.label[context.inblossom[w]] === Label.T_VERTEX);
                            context.label[w] = Label.T_VERTEX;
                            context.labelend[w] = followEdge(p);
                        }
                    } else if (context.label[context.inblossom[w]] === Label.S_VERTEX) {
                        // Keep track of the least-slack non-allowable edge to
                        // a different S-blossom.
                        const b = context.inblossom[v];
                        if (context.bestedge[b] === NoEdge || kslack! < slack(context, context.bestedge[b]))
                            context.bestedge[b] = k;
                    } else if (
                        context.label[w] === Label.NO_LABEL && // W is a free vertex (or an unreached vertex inside
                        // a T-blossom) but we can not reach it yet;
                        // keep track of the least-slack edge that reaches w.
                        (context.bestedge[w] === NoEdge || kslack! < slack(context, context.bestedge[w]))
                    )
                        context.bestedge[w] = k;
                }
            }

            if (augmented) break;

            // There is no augmenting path under these constraints;
            // compute delta and reduce slack in the optimization problem.
            // (Note that our vertex dual variables, edge slacks and delta's
            // are pre-multiplied by two.)

            // Verify data structures for delta2/delta3 computation.
            checkDelta2(context);
            checkDelta3(context);

            // Compute delta1: the minimum value of any vertex dual.
            deltaedge = NoEdge;
            deltablossom = NoVertex;
            deltatype = DeltaType.DELTA1;
            delta = min(context.dualvar, 0, context.nvertex);

            // Compute delta2: the minimum slack on any edge between
            // an S-vertex and a free vertex.
            for (const v of allVertices(context)) {
                if (context.label[context.inblossom[v]] === Label.NO_LABEL && context.bestedge[v] !== NoEdge) {
                    d = slack(context, context.bestedge[v]);
                    if (d < delta!) {
                        delta = d;
                        deltatype = DeltaType.DELTA2;
                        deltaedge = context.bestedge[v];
                    }
                }
            }

            // Compute delta3: half the minimum slack on any edge between
            // a pair of S-blossoms.
            for (const b of allVerticesAndBlossoms(context)) {
                if (context.blossomparent[b] === NoVertex && context.label[b] === Label.S_VERTEX && context.bestedge[b] !== NoEdge) {
                    kslack = slack(context, context.bestedge[b]);
                    d = kslack / 2;
                    if (d < delta!) {
                        delta = d;
                        deltatype = DeltaType.DELTA3;
                        deltaedge = context.bestedge[b];
                    }
                }
            }

            // Compute delta4: minimum z variable of any T-blossom.
            for (const b of allBlossoms(context)) {
                if (
                    context.blossombase[b] !== NoVertex &&
                    context.blossomparent[b] === NoVertex &&
                    context.label[b] === Label.T_VERTEX &&
                    (context.dualvar[b] < delta)
                ) {
                    delta = context.dualvar[b];
                    deltatype = DeltaType.DELTA4;
                    deltablossom = b;
                }
            }


            // Update dual variables according to delta.
            for (const v of allVertices(context)) {
                if (context.label[context.inblossom[v]] === Label.S_VERTEX) {
                    // S-vertex: 2*u = 2*u - 2*delta
                    context.dualvar[v] -= delta;
                } else if (context.label[context.inblossom[v]] === Label.T_VERTEX) {
                    // T-vertex: 2*u = 2*u + 2*delta
                    context.dualvar[v] += delta;
                }
            }

            for (const b of allBlossoms(context)) {
                if (context.blossombase[b] !== NoVertex && context.blossomparent[b] === NoVertex) {
                    if (context.label[b] === Label.S_VERTEX) {
                        // Top-level S-blossom: z = z + 2*delta
                        context.dualvar[b] += delta;
                    } else if (context.label[b] === Label.T_VERTEX) {
                        // Top-level T-blossom: z = z - 2*delta
                        context.dualvar[b] -= delta;
                    }
                }
            }

            if (deltatype === DeltaType.DELTA1) {
                // No further improvement possible; optimum reached.
                break;
            } else if (deltatype === DeltaType.DELTA2) {
                assert(deltaedge !== NoEdge);
                // Use the least-slack edge to continue the search.
                context.allowedge[deltaedge] = true;
                let i = edges[deltaedge][0];
                if (context.label[context.inblossom[i]] === 0) i = edges[deltaedge][1];
                assert(context.label[context.inblossom[i]] === Label.S_VERTEX);
                queue.push(i);
            } else if (deltatype === DeltaType.DELTA3) {
                // Use the least-slack edge to continue the search.
                context.allowedge[deltaedge] = true;
                const i = edges[deltaedge][0];
                assert(context.label[context.inblossom[i]] === Label.S_VERTEX);
                queue.push(i);
            } else {
                // Expand the least-z blossom.
                assert(deltatype == DeltaType.DELTA4);
                assert(deltablossom !== NoVertex);
                expandBlossom(queue, context, deltablossom, false);
            }
        }

        // End of a this substage.

        // Stop when no more augmenting path can be found.
        if (!augmented) break;

        // End of a stage; expand all S-blossoms which have dualvar = 0.
        for (const b of allBlossoms(context)) {
            if (
                context.blossomparent[b] === NoVertex &&
                context.blossombase[b] !== NoVertex &&
                context.label[b] === Label.S_VERTEX &&
                context.dualvar[b] === 0
            ) {
                expandBlossom(queue, context, b, true);
            }
        }
    }

    // Verify that we reached the optimum solution.
    verifyOptimum(context);

    const result: [VertexID, VertexID][] = [];

    // Transform mate[] such that mate[v] is the vertex to which v is paired.
    for (const from of allVertices(context)) {
        const itsMate = context.mate[from];
        if (itsMate !== NoEndpoint) {
            const to = context.endpoint[itsMate];
            if (to !== NoVertex) {
                result.push([from, to]);
            }
        }
    }

    return result;
}