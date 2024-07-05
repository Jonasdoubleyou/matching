import { assert } from "../util/assert";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer } from "./base";

export const BlossomMatcher: Matcher = function* GreedyMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    const nodeIds = new Map<NodeBase, number>();
    for (const [id, node] of input.nodes.entries())
        nodeIds.set(node, id);

    const edges: Edge[] = [];
    const edgesByNodes = new Map<string, EdgeBase>();

    for (const edge of input.edges) {
        const { from, to, weight } = edge;
        const fromID = nodeIds.get(from)!;
        const toID = nodeIds.get(to)!;

        const compressedEdge = [fromID, toID, weight] as const;
        edges.push(compressedEdge);
        edgesByNodes.set(fromID + "/" + toID, edge);
    }

    const matching: Matching = [];
    const inMatching = new Set<VertexID>();

    const resultMates = blossom(true, true)(edges);
    console.log("result", resultMates);

    for (const [from, to] of resultMates.entries()) {
        if (to == NoVertex) continue;

        if (inMatching.has(from) || inMatching.has(to)) continue;
        inMatching.add(from);
        inMatching.add(to);

        const decompressedEdge = edgesByNodes.get(from + "/" + to) ?? edgesByNodes.get(to + "/" + from);
        assert(decompressedEdge);

        matching.push(decompressedEdge!);
    }
    return matching;
}

// Implementation adapted from https://github.com/graph-algorithm/maximum-matching, 
// which is itself an adaption from http://jorisvr.nl/maximummatching.html
// All credit for the implementation goes to Joris van Rantwijk [http://jorisvr.nl].
//
// The algorithm is taken from "Efficient Algorithms for Finding Maximum
// Matching in Graphs" by Zvi Galil, ACM Computing Surveys, 1986.
// It is based on the "blossom" method for finding augmenting paths and
// the "primal-dual" method for finding a matching of maximum weight, both
// due to Jack Edmonds.
// Some ideas came from "Implementation of algorithms for maximum matching
// on non-bipartite graphs" by H.J. Gabow, Standford Ph.D. thesis, 1973.

type VertexID = number;
const NoVertex: VertexID = -1;

type Weight = number;
type Edge = readonly [VertexID, VertexID, Weight];
type BlossomChilds = VertexID[][];

type EdgeID = number;
type EdgeIDPerNode = EdgeID[][];

function* blossomEdges(nvertex: VertexID, blossomchilds: BlossomChilds, neighbend: BlossomChilds, bv: VertexID) {
	for (const v of blossomLeaves(nvertex, blossomchilds, bv)) {
		for (const p of neighbend[v]) yield Math.floor(p / 2);
	}
}

function* blossomLeaves(nvertex: VertexID, nodes: BlossomChilds, b: VertexID) {
	if (b < nvertex) yield b;
	else yield* _blossomLeavesDFS(nvertex, nodes, nodes[b].slice());
}

function* _blossomLeavesDFS(nvertex: VertexID, nodes: BlossomChilds, queue: VertexID[]) {
	while (queue.length > 0) {
		const b = queue.pop()!;
		if (b < nvertex) yield b;
		else for (const t of nodes[b]) queue.push(t);
	}
}

// Check optimized delta2 against a trivial computation.
function checkDelta2 ({
	nvertex,
	neighbend,
	label,
	endpoint,
	bestedge,
	slack,
	inblossom,
}: {
    nvertex: VertexID,
    neighbend: EdgeIDPerNode,
    label: any,
    endpoint: any,
    bestedge: any,
    slack: any,
    inblossom: any
}) {
	for (let v = 0; v < nvertex; ++v) {
		if (label[inblossom[v]] === 0) {
			let bd = null;
			let bk = NoVertex;
			for (let i = 0; i < neighbend[v].length; ++i) {
				const p = neighbend[v][i];
				const k = Math.floor(p / 2);
				const w = endpoint[p];
				if (label[inblossom[w]] === 1) {
					const d = slack(k);
					if (bk === NoVertex || d < bd) {
						bk = k;
						bd = d;
					}
				}
			}

			if (
				(bestedge[v] !== NoVertex || bk !== NoVertex) &&
				(bestedge[v] === NoVertex || bd !== slack(bestedge[v]))
			) {
				console.debug(
					'v=' +
						v +
						' bk=' +
						bk +
						' bd=' +
						bd +
						' bestedge=' +
						bestedge[v] +
						' slack=' +
						slack(bestedge[v]),
				);
			}

			assert(
				(bk === NoVertex && bestedge[v] === NoVertex) ||
					(bestedge[v] !== NoVertex && bd === slack(bestedge[v])),
			);
		}
	}
};

// Check optimized delta3 against a trivial computation.
export const checkDelta3 = ({
	nvertex,
	edges,
	blossomparent,
	blossomchilds,
	neighbend,
	label,
	endpoint,
	bestedge,
	slack,
	inblossom,
}: {
    nvertex: VertexID,
    edges: Edge[],
    blossomparent: any,
    blossomchilds: BlossomChilds,
    neighbend: EdgeIDPerNode,
    label: any,
    endpoint: any,
    bestedge: any,
    slack: any,
    inblossom: any
}) => {
	let bk = NoVertex;
	let bd = null;
	let tbk = NoVertex;
	let tbd = null;
	for (let b = 0; b < 2 * nvertex; ++b) {
		if (blossomparent[b] === NoVertex && label[b] === 1) {
			for (const v of blossomLeaves(nvertex, blossomchilds, b)) {
				for (const p of neighbend[v]) {
					const k = Math.floor(p / 2);
					const w = endpoint[p];
					if (inblossom[w] !== b && label[inblossom[w]] === 1) {
						const d = slack(k);
						if (bk === NoVertex || d < bd) {
							bk = k;
							bd = d;
						}
					}
				}
			}

			if (bestedge[b] !== NoVertex) {
				const i = edges[bestedge[b]][0];
				const j = edges[bestedge[b]][1];

				assert(inblossom[i] === b || inblossom[j] === b);
				assert(inblossom[i] !== b || inblossom[j] !== b);
				assert(label[inblossom[i]] === 1 && label[inblossom[j]] === 1);
				if (tbk === NoVertex || slack(bestedge[b]) < tbd) {
					tbk = bestedge[b];
					tbd = slack(bestedge[b]);
				}
			}
		}
	}

	if (bd !== tbd)
		console.debug('bk=' + bk + ' tbk=' + tbk + ' bd=' + bd + ' tbd=' + tbd);
	assert(bd === tbd);
};

function endpoints (nedge: number, edges: Edge[]) {
	const endpoint = [];
	for (let p = 0; p < nedge; ++p) {
		endpoint.push(edges[p][0], edges[p][1]);
	}

	return endpoint;
}

function min (a: number[], i: number, j: number) {
	let o = a[i];
	for (++i; i < j; ++i) if (a[i] < o) o = a[i];
	return o;
}

function neighbours (nvertex: VertexID, nedge: number, edges: Edge[]): EdgeIDPerNode {
	const neighbend: EdgeIDPerNode = [];

	for (let i = 0; i < nvertex; ++i) neighbend.push([]);

	for (let k = 0; k < nedge; ++k) {
		const i = edges[k][0];
		const j = edges[k][1];
		neighbend[i].push(2 * k + 1);
		neighbend[j].push(2 * k);
	}

	return neighbend;
};

function rotate <T>(a: T[], n: number) {
	const head = a.splice(0, n);
	for (let i = 0; i < n; ++i) {
		a.push(head[i]);
	}
};

const statistics = (edges: Edge[]) => {
	const nedge = edges.length;
	let nvertex = 0;
	let maxweight = 0;

	let length = nedge;
	while (length--) {
		const i = edges[length][0];
		const j = edges[length][1];
		const w = edges[length][2];

		assert(i >= 0 && j >= 0 && i !== j);
		if (i >= nvertex) nvertex = i + 1;
		if (j >= nvertex) nvertex = j + 1;

		maxweight = Math.max(maxweight, w);
	}

	return [nvertex, nedge, maxweight] as const;
};

// Verify that the optimum solution has been reached.
function verifyOptimum ({
	nvertex,
	edges,
	nedge,
	blossomparent,
	mate,
	endpoint,
	dualvar,
	blossombase,
	blossomendps,
}: {
    nvertex: VertexID,
	edges: Edge[],
	nedge: number,
	blossomparent: any,
	mate: any,
	endpoint: any,
	dualvar: any,
	blossombase: any,
	blossomendps: any,
}) {
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
	assert(min(dualvar, 0, nvertex) + vdualoffset >= 0);
	assert(min(dualvar, nvertex, 2 * nvertex) >= 0);
	// 0. all edges have non-negative slack and
	// 1. all matched edges have zero slack;
	for (k = 0; k < nedge; ++k) {
		i = edges[k][0];
		j = edges[k][1];
		wt = edges[k][2];

		s = dualvar[i] + dualvar[j] - 2 * wt;
		iblossoms = [i];
		jblossoms = [j];
		while (blossomparent[iblossoms.at(-1)!] !== NoVertex)
			iblossoms.push(blossomparent[iblossoms.at(-1)!]);
		while (blossomparent[jblossoms.at(-1)!] !== NoVertex)
			jblossoms.push(blossomparent[jblossoms.at(-1)!]);
		iblossoms.reverse();
		jblossoms.reverse();
		const length = Math.min(iblossoms.length, jblossoms.length);
		for (let x = 0; x < length; ++x) {
			const bi = iblossoms[x];
			const bj = jblossoms[x];
			if (bi !== bj) break;
			s += 2 * dualvar[bi];
		}

		assert(s >= 0);
		if (Math.floor(mate[i] / 2) === k || Math.floor(mate[j] / 2) === k) {
			assert(Math.floor(mate[i] / 2) === k && Math.floor(mate[j] / 2) === k);
			assert(s === 0);
		}
	}

	// 2. all single vertices have zero dual value;
	for (v = 0; v < nvertex; ++v)
		assert(mate[v] >= 0 || dualvar[v] + vdualoffset === 0);
	// 3. all blossoms with positive dual value are full.
	for (b = nvertex; b < 2 * nvertex; ++b) {
		if (blossombase[b] >= 0 && dualvar[b] > 0) {
			assert(blossomendps[b].length % 2 === 1);
			for (i = 1; i < blossomendps[b].length; i += 2) {
				p = blossomendps[b][i];
				assert((+(mate[endpoint[p]] === p) ^ 1) > 0);
				assert(mate[endpoint[p ^ 1]] === p);
			}
		}
	}
	// Ok.
};


export function blossom(CHECK_OPTIMUM: boolean, CHECK_DELTA: boolean) {
	// Check delta2/delta3 computation after every substage;
	// only works on integer weights, slows down the algorithm to O(n^4).
	if (CHECK_DELTA === undefined) CHECK_DELTA = false;

	// Check optimality of solution before returning; only works on integer weights.
	if (CHECK_OPTIMUM === undefined) CHECK_OPTIMUM = true;

	/**
	 * Compute a maximum-weighted matching in the general undirected
	 * weighted graph given by "edges"
	 *
	 * Edges is a sequence of tuples (i, j, wt) describing an undirected
	 * edge between vertex i and vertex j with weight wt.  There is at most
	 * one edge between any two vertices; no vertex has an edge to itthis.
	 * Vertices are identified by consecutive, non-negative integers.
	 *
	 * Return a list "mate", such that mate[i] === j if vertex i is
	 * matched to vertex j, and mate[i] === -1 if vertex i is not matched.
	 *
	 * This function takes time O(n^3)
	 *
	 * @param {Array} edges
	 * @return {Array}
	 */

	const maxWeightMatching = (edges: Edge[]) => {
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

		// Count vertices + find the maximum edge weight.
		const [nvertex, nedge, maxweight] = statistics(edges);

		// If p is an edge endpoint,
		// endpoint[p] is the vertex to which endpoint p is attached.
		// Not modified by the algorithm.
		const endpoint = endpoints(nedge, edges);

		// If v is a vertex,
		// neighbend[v] is the list of remote endpoints of the edges attached to v.
		// Not modified by the algorithm.
		const neighbend = neighbours(nvertex, nedge, edges);

		// If v is a vertex,
		// mate[v] is the remote endpoint of its matched edge, or -1 if it is single
		// (i.e. endpoint[mate[v]] is v's partner vertex).
		// Initially all vertices are single; updated during augmentation.
		const mate = new Array(nvertex).fill(NoVertex);

		// If b is a top-level blossom,
		// label[b] is 0 if b is unlabeled (free);
		//             1 if b is an S-vertex/blossom;
		//             2 if b is a T-vertex/blossom.
		// The label of a vertex is found by looking at the label of its
		// top-level containing blossom.
		// If v is a vertex inside a T-blossom,
		// label[v] is 2 iff v is reachable from an S-vertex outside the blossom.
		// Labels are assigned during a stage and reset after each augmentation.
		const label = new Array(2 * nvertex).fill(0);

		// If b is a labeled top-level blossom,
		// labelend[b] is the remote endpoint of the edge through which b obtained
		// its label, or -1 if b's base vertex is single.
		// If v is a vertex inside a T-blossom and label[v] === 2,
		// labelend[v] is the remote endpoint of the edge through which v is
		// reachable from outside the blossom.
		const labelend = new Array(2 * nvertex).fill(NoVertex);

		// If v is a vertex,
		// inblossom[v] is the top-level blossom to which v belongs.
		// If v is a top-level vertex, v is itthis a blossom (a trivial blossom)
		// and inblossom[v] === v.
		// Initially all vertices are top-level trivial blossoms.
		const inblossom = new Array(nvertex);
		for (let i = 0; i < nvertex; ++i) inblossom[i] = i;

		// If b is a sub-blossom,
		// blossomparent[b] is its immediate parent (sub-)blossom.
		// If b is a top-level blossom, blossomparent[b] is -1.
		const blossomparent = new Array(2 * nvertex).fill(NoVertex);

		// If b is a non-trivial (sub-)blossom,
		// blossomchilds[b] is an ordered list of its sub-blossoms, starting with
		// the base and going round the blossom.
		const blossomchilds = new Array(2 * nvertex).fill(null);

		// If b is a (sub-)blossom,
		// blossombase[b] is its base VERTEX (i.e. recursive sub-blossom).
		const blossombase = new Array(2 * nvertex);
		for (let i = 0; i < nvertex; ++i) blossombase[i] = i;
		blossombase.fill(NoVertex, nvertex, 2 * nvertex);

		// If b is a non-trivial (sub-)blossom,
		// blossomendps[b] is a list of endpoints on its connecting edges,
		// such that blossomendps[b][i] is the local endpoint of blossomchilds[b][i]
		// on the edge that connects it to blossomchilds[b][wrap(i+1)].
		const blossomendps = new Array(2 * nvertex).fill(null);

		// If v is a free vertex (or an unreached vertex inside a T-blossom),
		// bestedge[v] is the edge to an S-vertex with least slack,
		// or -1 if there is no such edge.
		// If b is a (possibly trivial) top-level S-blossom,
		// bestedge[b] is the least-slack edge to a different S-blossom,
		// or -1 if there is no such edge.
		// This is used for efficient computation of delta2 and delta3.
		const bestedge = new Array(2 * nvertex).fill(NoVertex);

		// If b is a non-trivial top-level S-blossom,
		// blossombestedges[b] is a list of least-slack edges to neighbouring
		// S-blossoms, or null if no such list has been computed yet.
		// This is used for efficient computation of delta3.
		const blossombestedges = new Array(2 * nvertex).fill(null);

		// List of currently unused blossom numbers.
		const unusedblossoms = new Array(nvertex);
		for (let i = 0; i < nvertex; ++i) unusedblossoms[i] = nvertex + i;

		// If v is a vertex,
		// dualvar[v] = 2 * u(v) where u(v) is the v's variable in the dual
		// optimization problem (multiplication by two ensures integer values
		// throughout the algorithm if all edge weights are integers).
		// If b is a non-trivial blossom,
		// dualvar[b] = z(b) where z(b) is b's variable in the dual optimization
		// problem.
		const dualvar = new Array(2 * nvertex);
		dualvar.fill(maxweight, 0, nvertex);
		dualvar.fill(0, nvertex, 2 * nvertex);

		// If allowedge[k] is true, edge k has zero slack in the optimization
		// problem; if allowedge[k] is false, the edge's slack may or may not
		// be zero.
		const allowedge = new Array(nedge).fill(false);

		// Queue of newly discovered S-vertices.
		let queue: VertexID[] = [];

		// Return 2 * slack of edge k (does not work inside blossoms).
		const slack = (k: EdgeID) => {
			const [i, j, wt] = edges[k];
			return dualvar[i] + dualvar[j] - 2 * wt;
		};

		// Assign label t to the top-level blossom containing vertex w
		// and record the fact that w was reached through the edge with
		// remote endpoint p.
		const assignLabel = (w: any, t: any, p: any) => {
			console.debug('DEBUG: assignLabel(' + w + ',' + t + ',' + p + ')');
			const b = inblossom[w];
			assert(label[w] === 0 && label[b] === 0);
			assert(t === 1 || t === 2);
			label[w] = t;
			label[b] = t;
			labelend[w] = p;
			labelend[b] = p;
			bestedge[w] = NoVertex;
			bestedge[b] = NoVertex;
			if (t === 1) {
				// B became an S-vertex/blossom; add it(s vertices) to the queue.
				for (const v of blossomLeaves(nvertex, blossomchilds, b)) {
					queue.push(v);
				}

				console.debug('DEBUG: PUSH ' + queue);
			} else {
				// B became a T-vertex/blossom; assign label S to its mate.
				// (If b is a non-trivial blossom, its base is the only vertex
				// with an external mate.)
				const base = blossombase[b];
				assert(mate[base] >= 0);
				assignLabel(endpoint[mate[base]], 1, mate[base] ^ 1);
			}
		};

		// Trace back from vertices v and w to discover either a new blossom
		// or an augmenting path. Return the base vertex of the new blossom or -1.
		const scanBlossom = (v: VertexID, w: VertexID) => {
			console.debug('DEBUG: scanBlossom(' + v + ',' + w + ')');
			// Trace back from v and w, placing breadcrumbs as we go.
			const path = [];
			let base = NoVertex;
			while (v !== NoVertex || w !== NoVertex) {
				// Look for a breadcrumb in v's blossom or put a new breadcrumb.
				let b = inblossom[v];
				if (label[b] & 4) {
					base = blossombase[b];
					break;
				}

				assert(label[b] === 1);
				path.push(b);
				label[b] = 5;
				// Trace one step back.
				assert(labelend[b] === mate[blossombase[b]]);
				if (labelend[b] === NoVertex) {
					// The base of blossom b is single; stop tracing this path.
					v = NoVertex;
				} else {
					v = endpoint[labelend[b]];
					b = inblossom[v];
					assert(label[b] === 2);
					// B is a T-blossom; trace one more step back.
					assert(labelend[b] >= 0);
					v = endpoint[labelend[b]];
				}

				// Swap v and w so that we alternate between both paths.
				if (w !== NoVertex) {
					const temporary_ = v;
					v = w;
					w = temporary_;
				}
			}

			// Remove breadcrumbs.
			for (const b of path) label[b] = 1;

			// Return base vertex, if we found one.
			return base;
		};

		// Construct a new blossom with given base, containing edge k which
		// connects a pair of S vertices. Label the new blossom as S; set its dual
		// variable to zero; relabel its T-vertices to S and add them to the queue.
		const addBlossom = (base: any, k: any) => {
			let v = edges[k][0];
			let w = edges[k][1];
			const bb = inblossom[base];
			let bv = inblossom[v];
			let bw = inblossom[w];
			// Create blossom.
			const b = unusedblossoms.pop();
			console.debug(
				'DEBUG: addBlossom(' +
					base +
					',' +
					k +
					') (v=' +
					v +
					' w=' +
					w +
					') -> ' +
					b,
			);
			blossombase[b] = base;
			blossomparent[b] = NoVertex;
			blossomparent[bb] = b;
			// Make list of sub-blossoms and their interconnecting edge endpoints.
			const path: any[] = [];
			blossomchilds[b] = path;
			const endps: any[] = [];
			blossomendps[b] = endps;
			// Trace back from v to base.
			while (bv !== bb) {
				// Add bv to the new blossom.
				blossomparent[bv] = b;
				path.push(bv);
				endps.push(labelend[bv]);
				assert(
					label[bv] === 2 ||
						(label[bv] === 1 && labelend[bv] === mate[blossombase[bv]]),
				);
				// Trace one step back.
				assert(labelend[bv] >= 0);
				v = endpoint[labelend[bv]];
				bv = inblossom[v];
			}

			// Reverse lists, add endpoint that connects the pair of S vertices.
			path.push(bb);
			path.reverse();
			endps.reverse();
			endps.push(2 * k);
			// Trace back from w to base.
			while (bw !== bb) {
				// Add bw to the new blossom.
				blossomparent[bw] = b;
				path.push(bw);
				endps.push(labelend[bw] ^ 1);
				assert(
					label[bw] === 2 ||
						(label[bw] === 1 && labelend[bw] === mate[blossombase[bw]]),
				);
				// Trace one step back.
				assert(labelend[bw] >= 0);
				w = endpoint[labelend[bw]];
				bw = inblossom[w];
			}

			// Set label to S.
			assert(label[bb] === 1);
			label[b] = 1;
			labelend[b] = labelend[bb];
			// Set dual variable to zero.
			dualvar[b] = 0;
			// Relabel vertices.
			for (const v of blossomLeaves(nvertex, blossomchilds, b)) {
				if (label[inblossom[v]] === 2) {
					// This T-vertex now turns into an S-vertex because it becomes
					// part of an S-blossom; add it to the queue.
					queue.push(v);
				}

				inblossom[v] = b;
			}

			// Compute blossombestedges[b].
			const bestedgeto = new Array(2 * nvertex).fill(NoVertex);

			const length_ = path.length;
			for (let z = 0; z < length_; ++z) {
				const bv = path[z];
				// Walk this subblossom's least-slack edges.
				let nblist = blossombestedges[bv];
				if (nblist === null) {
					// This subblossom does not have a list of least-slack edges;
					// get the information from the vertices.
					nblist = blossomEdges(nvertex, blossomchilds, neighbend, bv);
				}

				for (const k of nblist) {
					const [i, j] = edges[k];
					const bj = inblossom[j] === b ? inblossom[i] : inblossom[j];

					if (
						bj !== b &&
						label[bj] === 1 &&
						(bestedgeto[bj] === NoVertex || slack(k) < slack(bestedgeto[bj]))
					) {
						bestedgeto[bj] = k;
					}
				}

				// Forget about least-slack edges of the subblossom.
				blossombestedges[bv] = null;
				bestedge[bv] = NoVertex;
			}

			blossombestedges[b] = [];
			const length_2 = bestedgeto.length;
			for (let i = 0; i < length_2; ++i) {
				k = bestedgeto[i];
				if (k !== NoVertex) blossombestedges[b].push(k);
			}

			// Select bestedge[b].

			const length_3 = blossombestedges[b].length;
			if (length_3 > 0) {
				bestedge[b] = blossombestedges[b][0];
				for (let i = 1; i < length_3; ++i) {
					k = blossombestedges[b][i];
					if (slack(k) < slack(bestedge[b])) {
						bestedge[b] = k;
					}
				}
			} else bestedge[b] = NoVertex;

			console.debug('DEBUG: blossomchilds[' + b + ']=' + blossomchilds[b]);
		};

		// Expand the given top-level blossom.
		const expandBlossom = (b: any, endstage: boolean) => {
			console.debug(
				'DEBUG: expandBlossom(' + b + ',' + endstage + ') ' + blossomchilds[b],
			);
			// Convert sub-blossoms into top-level blossoms.
			for (let i = 0; i < blossomchilds[b].length; ++i) {
				const s = blossomchilds[b][i];

				blossomparent[s] = NoVertex;
				if (s < nvertex) inblossom[s] = s;
				else if (endstage && dualvar[s] === 0) {
					// Recursively expand this sub-blossom.
					expandBlossom(s, endstage);
				} else {
					for (const v of blossomLeaves(nvertex, blossomchilds, s)) {
						inblossom[v] = s;
					}
				}
			}

			// If we expand a T-blossom during a stage, its sub-blossoms must be
			// relabeled.
			if (!endstage && label[b] === 2) {
				// Start at the sub-blossom through which the expanding
				// blossom obtained its label, and relabel sub-blossoms untili
				// we reach the base.
				// Figure out through which sub-blossom the expanding blossom
				// obtained its label initially.
				assert(labelend[b] >= 0);
				const entrychild = inblossom[endpoint[labelend[b] ^ 1]];
				// Decide in which direction we will go round the blossom.
				let j = blossomchilds[b].indexOf(entrychild);
				let jstep;
				let endptrick;
				let stop;
				let base;
				if (j & 1) {
					// Start index is odd; go forward.
					jstep = 1;
					endptrick = 0;
					stop = blossomchilds[b].length;
					base = 0;
				} else {
					// Start index is even; go backward.
					jstep = -1;
					endptrick = 1;
					stop = 0;
					base = blossomchilds[b].length;
				}

				// Move along the blossom until we get to the base.
				let p = labelend[b];
				while (j !== stop) {
					// Relabel the T-sub-blossom.
					label[endpoint[p ^ 1]] = 0;
					label[endpoint[blossomendps[b][j - endptrick] ^ endptrick ^ 1]] = 0;
					assignLabel(endpoint[p ^ 1], 2, p);
					// Step to the next S-sub-blossom and note its forward endpoint.
					allowedge[Math.floor(blossomendps[b][j - endptrick] / 2)] = true;
					j += jstep;
					p = blossomendps[b][j - endptrick] ^ endptrick;
					// Step to the next T-sub-blossom.
					allowedge[Math.floor(p / 2)] = true;
					j += jstep;
				}

				// Relabel the base T-sub-blossom WITHOUT stepping through to
				// its mate (so don't call assignLabel).
				let bv = blossomchilds[b][0];
				label[endpoint[p ^ 1]] = 2;
				label[bv] = 2;
				labelend[endpoint[p ^ 1]] = p;
				labelend[bv] = p;
				bestedge[bv] = NoVertex;
				// Continue along the blossom until we get back to entrychild.
				j = base + jstep;
				while (blossomchilds[b][j] !== entrychild) {
					// Examine the vertices of the sub-blossom to see whether
					// it is reachable from a neighbouring S-vertex outside the
					// expanding blossom.
					bv = blossomchilds[b][j];
					if (label[bv] === 1) {
						// This sub-blossom just got label S through one of its
						// neighbours; leave it.
						j += jstep;
						continue;
					}

					for (const v of blossomLeaves(nvertex, blossomchilds, bv)) {
						if (label[v] === 0) continue;
						// If the sub-blossom contains a reachable vertex, assign
						// label T to the sub-blossom.
						assert(label[v] === 2);
						assert(inblossom[v] === bv);
						label[v] = 0;
						label[endpoint[mate[blossombase[bv]]]] = 0;
						assignLabel(v, 2, labelend[v]);
						break;
					}

					j += jstep;
				}
			}

			// Recycle the blossom number.
			label[b] = -1;
			labelend[b] = -1;
			blossomchilds[b] = null;
			blossomendps[b] = null;
			blossombase[b] = NoVertex;
			blossombestedges[b] = null;
			bestedge[b] = NoVertex;
			unusedblossoms.push(b);
		};

		// Swap matched/unmatched edges over an alternating path through blossom b
		// between vertex v and the base vertex. Keep blossom bookkeeping consistent.
		const augmentBlossom = (b: any, v: any) => {
			console.debug('DEBUG: augmentBlossom(' + b + ',' + v + ')');
			// Bubble up through the blossom tree from vertex v to an immediate
			// sub-blossom of b.
			let j;
			let jstep;
			let endptrick;
			let stop;
			let p;
			let t = v;
			while (blossomparent[t] !== b) t = blossomparent[t];
			// Recursively deal with the first sub-blossom.
			if (t >= nvertex) augmentBlossom(t, v);
			// Decide in which direction we will go round the blossom.
			j = blossomchilds[b].indexOf(t);
			const i = j;
			const length_ = blossomchilds[b].length;
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
				t = blossomchilds[b][j];
				p = blossomendps[b][j - endptrick] ^ endptrick;
				if (t >= nvertex) augmentBlossom(t, endpoint[p]);
				// Step to the next sub-blossom and augment it recursively.
				j += jstep;
				t = blossomchilds[b][Math.abs(j % length_)];
				if (t >= nvertex) augmentBlossom(t, endpoint[p ^ 1]);
				// Match the edge connecting those sub-blossoms.
				mate[endpoint[p]] = p ^ 1;
				mate[endpoint[p ^ 1]] = p;
				console.debug(
					'DEBUG: PAIR ' +
						endpoint[p] +
						' ' +
						endpoint[p ^ 1] +
						' (k=' +
						Math.floor(p / 2) +
						')',
				);
			}

			// Rotate the list of sub-blossoms to put the new base at the front.
			rotate(blossomchilds[b], i);
			rotate(blossomendps[b], i);
			blossombase[b] = blossombase[blossomchilds[b][0]];
			assert(blossombase[b] === v);
		};

		// Swap matched/unmatched edges over an alternating path between two
		// single vertices. The augmenting path runs through edge k, which
		// connects a pair of S vertices.
		const augmentMatching = (k: EdgeID) => {
			const v = edges[k][0];
			const w = edges[k][1];

			console.debug(
				'DEBUG: augmentMatching(' + k + ') (v=' + v + ' w=' + w + ')',
			);
			console.debug('DEBUG: PAIR ' + v + ' ' + w + ' (k=' + k + ')');

			matchVerticesAndFix(v, 2 * k + 1);
			matchVerticesAndFix(w, 2 * k);
		};

		const matchVerticesAndFix = (s: any, p: any) => {
			// Match vertex s to remote endpoint p. Then trace back from s
			// until we find a single vertex, swapping matched and unmatched
			// edges as we go.
			// eslint-disable-next-line no-constant-condition
			while (true) {
				const bs = inblossom[s];
				assert(label[bs] === 1);
				assert(labelend[bs] === mate[blossombase[bs]]);
				// Augment through the S-blossom from s to base.
				if (bs >= nvertex) augmentBlossom(bs, s);
				// Update mate[s]
				mate[s] = p;
				// Trace one step back.
				if (labelend[bs] === NoVertex) {
					// Reached single vertex; stop.
					break;
				}

				const t = endpoint[labelend[bs]];
				const bt = inblossom[t];
				assert(label[bt] === 2);
				// Trace one step back.
				assert(labelend[bt] >= 0);
				s = endpoint[labelend[bt]];
				const j = endpoint[labelend[bt] ^ 1];
				// Augment through the T-blossom from j to base.
				assert(blossombase[bt] === t);
				if (bt >= nvertex) augmentBlossom(bt, j);
				// Update mate[j]
				mate[j] = labelend[bt];
				// Keep the opposite endpoint;
				// it will be assigned to mate[s] in the next step.
				p = labelend[bt] ^ 1;
				console.debug(
					'DEBUG: PAIR ' + s + ' ' + t + ' (k=' + Math.floor(p / 2) + ')',
				);
			}
		};

		let d;
		let kslack: number;
		let base;
		let deltatype;
		let delta;
		let deltaedge;
		let deltablossom;

		// Main loop: continue until no further improvement is possible.
		for (let t = 0; t < nvertex; ++t) {
			// Each iteration of this loop is a "stage".
			// A stage finds an augmenting path and uses that to improve
			// the matching.
			console.debug('DEBUG: STAGE ' + t);

			// Remove labels from top-level blossoms/vertices.
			label.fill(0);

			// Forget all about least-slack edges.
			bestedge.fill(NoVertex);
			blossombestedges.fill(null, nvertex, 2 * nvertex);

			// Loss of labeling means that we can not be sure that currently
			// allowable edges remain allowable througout this stage.
			allowedge.fill(false);

			// Make queue empty.
			queue = [];

			// Label single blossoms/vertices with S and put them in the queue.
			for (let v = 0; v < nvertex; ++v) {
				if (mate[v] === NoVertex && label[inblossom[v]] === 0) assignLabel(v, 1, -1);
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
				console.debug('DEBUG: SUBSTAGE');

				// Continue labeling until all vertices which are reachable
				// through an alternating path have got a label.
				while (queue.length > 0 && !augmented) {
					// Take an S vertex from the queue.
					const v = queue.pop()!;
					console.debug('DEBUG: POP v=' + v);
					assert(label[inblossom[v]] === 1);

					// Scan its neighbours:
					const length = neighbend[v].length;
					for (let i = 0; i < length; ++i) {
						const p = neighbend[v][i];
						const k = Math.floor(p / 2);
						const w = endpoint[p];
						// W is a neighbour to v
						if (inblossom[v] === inblossom[w]) {
							// This edge is internal to a blossom; ignore it
							continue;
						}

						if (!allowedge[k]) {
							kslack = slack(k);
							if (kslack <= 0) {
								// Edge k has zero slack => it is allowable
								allowedge[k] = true;
							}
						}

						if (allowedge[k]) {
							if (label[inblossom[w]] === 0) {
								// (C1) w is a free vertex;
								// label w with T and label its mate with S (R12).
								assignLabel(w, 2, p ^ 1);
							} else if (label[inblossom[w]] === 1) {
								// (C2) w is an S-vertex (not in the same blossom);
								// follow back-links to discover either an
								// augmenting path or a new blossom.
								base = scanBlossom(v, w);
								if (base >= 0) {
									// Found a new blossom; add it to the blossom
									// bookkeeping and turn it into an S-blossom.
									addBlossom(base, k);
								} else {
									// Found an augmenting path; augment the
									// matching and end this stage.
									augmentMatching(k);
									augmented = true;
									break;
								}
							} else if (label[w] === 0) {
								// W is inside a T-blossom, but w itthis has not
								// yet been reached from outside the blossom;
								// mark it as reached (we need this to relabel
								// during T-blossom expansion).
								assert(label[inblossom[w]] === 2);
								label[w] = 2;
								labelend[w] = p ^ 1;
							}
						} else if (label[inblossom[w]] === 1) {
							// Keep track of the least-slack non-allowable edge to
							// a different S-blossom.
							const b = inblossom[v];
							if (bestedge[b] === NoVertex || kslack! < slack(bestedge[b]))
								bestedge[b] = k;
						} else if (
							label[w] === 0 && // W is a free vertex (or an unreached vertex inside
							// a T-blossom) but we can not reach it yet;
							// keep track of the least-slack edge that reaches w.
							(bestedge[w] === NoVertex || kslack! < slack(bestedge[w]))
						)
							bestedge[w] = k;
					}
				}

				if (augmented) break;

				// There is no augmenting path under these constraints;
				// compute delta and reduce slack in the optimization problem.
				// (Note that our vertex dual variables, edge slacks and delta's
				// are pre-multiplied by two.)
				deltatype = -1;
				delta = null;
				deltaedge = null;
				deltablossom = null;

				// Verify data structures for delta2/delta3 computation.
				if (CHECK_DELTA) {
					checkDelta2({
						nvertex,
						neighbend,
						label,
						endpoint,
						bestedge,
						slack,
						inblossom,
					});
					checkDelta3({
						nvertex,
						edges,
						blossomparent,
						blossomchilds,
						neighbend,
						label,
						endpoint,
						bestedge,
						slack,
						inblossom,
					});
				}

				// Compute delta1: the minumum value of any vertex dual.
				deltatype = 1;
				delta = min(dualvar, 0, nvertex);

				// Compute delta2: the minimum slack on any edge between
				// an S-vertex and a free vertex.
				for (let v = 0; v < nvertex; ++v) {
					if (label[inblossom[v]] === 0 && bestedge[v] !== -1) {
						d = slack(bestedge[v]);
						if (deltatype === -1 || d < delta!) {
							delta = d;
							deltatype = 2;
							deltaedge = bestedge[v];
						}
					}
				}

				// Compute delta3: half the minimum slack on any edge between
				// a pair of S-blossoms.
				for (let b = 0; b < 2 * nvertex; ++b) {
					if (blossomparent[b] === -1 && label[b] === 1 && bestedge[b] !== -1) {
						kslack = slack(bestedge[b]);
						d = kslack / 2;
						if (deltatype === -1 || d < delta!) {
							delta = d;
							deltatype = 3;
							deltaedge = bestedge[b];
						}
					}
				}

				// Compute delta4: minimum z variable of any T-blossom.
				for (let b = nvertex; b < 2 * nvertex; ++b) {
					if (
						blossombase[b] >= 0 &&
						blossomparent[b] === -1 &&
						label[b] === 2 &&
						(deltatype === -1 || dualvar[b] < delta)
					) {
						delta = dualvar[b];
						deltatype = 4;
						deltablossom = b;
					}
				}


				// Update dual variables according to delta.
				for (let v = 0; v < nvertex; ++v) {
					if (label[inblossom[v]] === 1) {
						// S-vertex: 2*u = 2*u - 2*delta
						dualvar[v] -= delta;
					} else if (label[inblossom[v]] === 2) {
						// T-vertex: 2*u = 2*u + 2*delta
						dualvar[v] += delta;
					}
				}

				for (let b = nvertex; b < 2 * nvertex; ++b) {
					if (blossombase[b] >= 0 && blossomparent[b] === -1) {
						if (label[b] === 1) {
							// Top-level S-blossom: z = z + 2*delta
							dualvar[b] += delta;
						} else if (label[b] === 2) {
							// Top-level T-blossom: z = z - 2*delta
							dualvar[b] -= delta;
						}
					}
				}

				// Take action at the point where minimum delta occurred.
				console.debug('DEBUG: delta' + deltatype + '=' + delta);
				assert(
					deltatype === 1 ||
						deltatype === 2 ||
						deltatype === 3 ||
						deltatype === 4,
				);
				if (deltatype === 1) {
					// No further improvement possible; optimum reached.
					break;
				} else if (deltatype === 2) {
					// Use the least-slack edge to continue the search.
					allowedge[deltaedge] = true;
					let i = edges[deltaedge][0];
					if (label[inblossom[i]] === 0) i = edges[deltaedge][1];
					assert(label[inblossom[i]] === 1);
					queue.push(i);
				} else if (deltatype === 3) {
					// Use the least-slack edge to continue the search.
					allowedge[deltaedge] = true;
					const i = edges[deltaedge][0];
					assert(label[inblossom[i]] === 1);
					queue.push(i);
				} else {
					// Expand the least-z blossom.
					expandBlossom(deltablossom, false);
				}
			}

			// End of a this substage.

			// Stop when no more augmenting path can be found.
			if (!augmented) break;

			// End of a stage; expand all S-blossoms which have dualvar = 0.
			for (let b = nvertex; b < 2 * nvertex; ++b) {
				if (
					blossomparent[b] === -1 &&
					blossombase[b] >= 0 &&
					label[b] === 1 &&
					dualvar[b] === 0
				) {
					expandBlossom(b, true);
				}
			}
		}

		// Verify that we reached the optimum solution.
		if (CHECK_OPTIMUM)
			verifyOptimum({
				nvertex,
				edges,
				nedge,
				blossomparent,
				mate,
				endpoint,
				dualvar,
				blossombase,
				blossomendps,
			});

		// Transform mate[] such that mate[v] is the vertex to which v is paired.
		for (let v = 0; v < nvertex; ++v) {
			if (mate[v] >= 0) {
				mate[v] = endpoint[mate[v]];
			}
		}

		for (let v = 0; v < nvertex; ++v) {
			assert(mate[v] === NoVertex || mate[mate[v]] === v);
		}

		return mate;
	};

	return maxWeightMatching;
}