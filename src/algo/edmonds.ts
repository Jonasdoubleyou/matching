import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer } from "./base";
import { AdjacencyList } from "../datastructures/adjacency_list";

function assert(value: any) {
    if (!value) throw new Error(`Assertion failed`);
}

type Vertex = Blossom | NodeBase;
type Edge = { from: Vertex; to: Vertex };

function vertexId(vertex: Vertex) {
    return (vertex instanceof Blossom ? "blossom" : "node") + vertex.id;
}

function edgeId(edge: Edge, directed: boolean = false) {
    const a = vertexId(edge.from);
    const b = vertexId(edge.to);
    return (directed || a > b) ? a + "/" + b : b + "/" + a;
}

class EdgeSet {
    ids = new Set<string>();

    constructor(public directed: boolean) {}

    add(edge: Edge) {
        this.ids.add(edgeId(edge, this.directed));
    }

    has(edge: Edge) {
        return this.ids.has(edgeId(edge, this.directed));
    }

    delete(edge: Edge) {
        return this.ids.delete(edgeId(edge, this.directed));
    }

    clear() { this.ids.clear(); }
}

let count = 0;
class Blossom {
    id = (count += 1);
    /// Representation of a non-trivial blossom or sub-blossom

    // ordered list of sub-blossoms, starting with the base and going round the blossom.
    childs: Vertex[] = [];

    // list of b's connecting edges, such that edges[i] = (v, w) where v is a vertex in childs[i]
    //  and w is a vertex in b.childs[wrap(i+1)].
    edges: Edge[] = [];

    // //  If this is a top-level S-blossom, mybestedges is a list of least-slack edges to neighboring
    // S-blossoms, or None if no such list has been computed yet. This is used for efficient computation of delta3.
    mybestedges: Edge[] | null = null;

    // Generate the blossom's leaf vertices.
    *leaves(): Generator<NodeBase> {
        for (const child of this.childs) {
            if (child instanceof Blossom) {
                yield* child.leaves();
            } else yield child;
        }
    }
}

const NoNode: NodeBase = { id: -1 };

export const EdmondsMatcher: Matcher = function* GreedyMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    // Ported from a Python implementation found at https://github.com/networkx/networkx
    // Many thanks to the NetworkX Developers!

    // The algorithm is taken from "Efficient Algorithms for Finding Maximum
    // Matching in Graphs" by Zvi Galil, ACM Computing Surveys, 1986.
    // It is based on the "blossom" method for finding augmenting paths and
    // the "primal-dual" method for finding a matching of maximum weight, both
    // methods invented by Jack Edmonds.
    //
    // Many terms used in the code comments are explained in the paper
    // by Galil. You will probably need the paper to make sense of this code.

    const adjacencyList = new AdjacencyList();
    visualize?.data("adjacenceList", adjacencyList.adjacencyList);

    yield* adjacencyList.fill(input.edges);

    function* neighbors(v: Vertex) {
        assert(!(v instanceof Blossom));
        for (const edge of adjacencyList.edgesOf(v as NodeBase)) {
            if (v !== edge.from) yield edge.from;
            if (v !== edge.to) yield edge.to;
        }
    }

    const weights = new Map<string, number>();
    for (const edge of input.edges) {
        weights.set(edgeId(edge), edge.weight);
    }

    function weight(edge: Edge, defaultWeight: number) {
        return weights.get(edgeId(edge)) ?? defaultWeight;
    }

    // Find the maximum edge weight
    let maxweight = 0;
    for (const edge of input.edges) {
        if (edge.weight > maxweight) maxweight = edge.weight; 
    }
    
    // If v is a matched vertex, mate[v] is its partner vertex.
    // If v is a single vertex, v does not occur as a key in mate.
    // Initially all vertices are single; updated during augmentation.
    const mate = new Map<Vertex, Vertex>();
    visualize?.data("mate", mate);

    // If b is a top-level blossom,
    // label.get(b) is None if b is unlabeled (free),
    //               1 if b is an S-blossom,
    //               2 if b is a T-blossom.
    // The label of a vertex is found by looking at the label of its top-level
    // containing blossom.
    // If v is a vertex inside a T-blossom, label[v] is 2 iff v is reachable
    // from an S-vertex outside the blossom.
    // Labels are assigned during a stage and reset after each augmentation.
    const label = new Map<Vertex, number>();
    visualize?.data("label", label);

    // If b is a labeled top-level blossom,
    // labeledge[b] = (v, w) is the edge through which b obtained its label
    // such that w is a vertex in b, or None if b's base vertex is single.
    // If w is a vertex inside a T-blossom and label[w] == 2,
    // labeledge[w] = (v, w) is an edge through which w is reachable from
    // outside the blossom.
    const labeledge = new Map<Vertex, Edge>();
    visualize?.data("labeledge", labeledge);

    // If v is a vertex, inblossom[v] is the top-level blossom to which v
    // belongs.
    // If v is a top-level vertex, inblossom[v] == v since v is itself
    // a (trivial) top-level blossom.
    // Initially all vertices are top-level trivial blossoms.
    const inblossom = new Map<Vertex, Vertex>();
    visualize?.data("inblossom", inblossom);
    for (const node of input.nodes)
        inblossom.set(node, node);

    // If b is a sub-blossom,
    // blossomparent[b] is its immediate parent (sub-)blossom.
    // If b is a top-level blossom, blossomparent[b] is None.
    const blossomparent = new Map<Vertex, Blossom>();
    visualize?.data("blossomparent", blossomparent);

    // If b is a (sub-)blossom,
    // blossombase[b] is its base VERTEX (i.e. recursive sub-blossom).
    const blossombase = new Map<Vertex, Vertex>();
    visualize?.data("blossombase", blossombase);
    for (const node of input.nodes)
        blossombase.set(node, node);


    // If w is a free vertex (or an unreached vertex inside a T-blossom),
    // bestedge[w] = (v, w) is the least-slack edge from an S-vertex,
    // or None if there is no such edge.
    // If b is a (possibly trivial) top-level S-blossom,
    // bestedge[b] = (v, w) is the least-slack edge to a different S-blossom
    // (v inside b), or None if there is no such edge.
    // This is used for efficient computation of delta2 and delta3.
    const bestedge = new Map<Vertex, Edge>();
    visualize?.data("bestedge", bestedge);

    // If v is a vertex,
    // dualvar[v] = 2 * u(v) where u(v) is the v's variable in the dual
    // optimization problem (if all edge weights are integers, multiplication
    // by two ensures that all values remain integers throughout the algorithm).
    // Initially, u(v) = maxweight / 2.
    const dualvar = new Map<Vertex, number>();
    visualize?.data("dualvar", dualvar);
    for (const node of input.nodes)
        dualvar.set(node, maxweight);
    
    // If b is a non-trivial blossom,
    // blossomdual[b] = z(b) where z(b) is b's variable in the dual
    // optimization problem.
    const blossomdual = new Map<Vertex, number>();
    visualize?.data("blossomdual", blossomdual);

    // If (v, w) in allowedge or (w, v) in allowedge, then the edge
    // (v, w) is known to have zero slack in the optimization problem;
    // otherwise the edge may or may not have zero slack.
    const allowedge = new EdgeSet(false);
    visualize?.data("allowedge", allowedge.ids);

    // Queue of newly discovered S-vertices.
    let queue: Vertex[] = []; // TODO: Queue?
    visualize?.data("queue", queue);

    // Return 2 * slack of edge (v, w) (does not work inside blossoms)
    function slack(edge: Edge) {
        console.log(`Slack - dual_from: ${dualvar.get(edge.from)!} - dual_to: ${dualvar.get(edge.to)} - weight: ${weight(edge, NaN)}`);
        return dualvar.get(edge.from)! + dualvar.get(edge.to)! - 2 * weight(edge, 0)
    }

    // Assign label t to the top-level blossom containing vertex w,
    // coming through an edge from vertex v.
    function assignLabel(w: Vertex, t: number, v: Vertex | null) {
        console.log("assignLabel", w, t, v);

        const b = inblossom.get(w)!;
        assert(!label.has(w) && !label.has(b));
        label.set(w, t);
        label.set(b, t);

        visualize?.pickNode(w, t === 1 ? 'blue' : 'red');
        visualize?.pickNode(b, t === 1 ? 'blue' : 'red');

        if (v) {
            const edge = { from: v, to: w };
            labeledge.set(w, edge);
            labeledge.set(b, edge);
        } else {
            labeledge.delete(w);
            labeledge.delete(b);
        }

        bestedge.delete(w);
        bestedge.delete(b);
        console.log("Removed from bestedge", w, b);

        if(t == 1) {
            // b became an S-vertex/blossom; add it(s vertices) to the queue.
            if (b instanceof Blossom) {
                queue.push(...b.leaves());
            } else {
                queue.push(b);
                console.log("enqued", b);
            }
        } else if (t == 2) {
            // b became a T-vertex/blossom; assign label S to its mate.
            // (If b is a non-trivial blossom, its base is the only vertex
            // with an external mate.)
            const base = blossombase.get(b)!;
            assignLabel(mate.get(base)!, 1, base);
        }
    }

    // Trace back from vertices v and w to discover either a new blossom
    // or an augmenting path. Return the base vertex of the new blossom,
    // or NoNode if an augmenting path was found.
    function scanBlossom(v: Vertex, w: Vertex) {
        console.log("scanBlossom", v, w);

        // Trace back from v and w, placing breadcrumbs as we go.
        const path: Vertex[] = []
        let base: Vertex = NoNode;
        while(v !== NoNode) {
            //  Look for a breadcrumb in v's blossom or put a new breadcrumb.
            let b: Vertex = inblossom.get(v)!;
            if (label.has(b) && (label.get(b)! & 4)) {
                base = blossombase.get(b)!;
                break
            }
            assert(label.get(b) == 1);
            path.push(b)
            label.set(b, 5);
            visualize?.pickNode(b, 'blue');
            //  Trace one step back.
            if(!labeledge.has(b)) {
                //  The base of blossom b is single; stop tracing this path.
                assert(!mate.has(blossombase.get(b)!));
                v = NoNode
            } else {
                assert(labeledge.get(b)!.from == mate.get(blossombase.get(b)!));
                v = labeledge.get(b)!.from;
                b = inblossom.get(v)!;
                assert(label.get(b) == 2);
                //  b is a T-blossom; trace one more step back.
                v = labeledge.get(b)!.from;
            }

            //  Swap v and w so that we alternate between both paths.
            if(w !== NoNode) {
                ([v, w] = [w, v]);
            }
        }

        //  Remove breadcrumbs.
        for(const b of path) {
            label.set(b, 1);
            visualize?.pickNode(b, 'red');
        }

        //  Return base vertex, if we found one.
        return base;
    }

    //  Construct a new blossom with given base, through S-vertices v and w.
    //  Label the new blossom as S; set its dual variable to zero;
    //  relabel its T-vertices to S and add them to the queue.
    function addBlossom(base: Vertex, v: Vertex, w: Vertex) {
        console.log("addBlossom", base, v, w);

        const bb = inblossom.get(base)!;
        let bv = inblossom.get(v)!;
        let bw = inblossom.get(w)!;

        //  Create blossom.
        const b = new Blossom();
        blossombase.set(b, base)
        blossomparent.delete(b);
        blossomparent.set(bb, b);

        //  Make list of sub-blossoms and their interconnecting edge endpoints.
        const path = b.childs;
        const edgs = b.edges;
        edgs.push({ from: v, to : w });

        //  Trace back from v to base.
        while(bv !== bb) {
            //  Add bv to the new blossom.
            blossomparent.set(bv, b);
            path.push(bv)
            edgs.push(labeledge.get(bv)!);
            assert(label.get(bv) == 2 || (
                label.get(bv) == 1 && labeledge.get(bv)!.from == mate.get(blossombase.get(bv)!))
            );

            //  Trace one step back.
            v = labeledge.get(bv)!.from;
            bv = inblossom.get(v)!;
        }

        //  Add base sub-blossom; reverse lists.
        path.push(bb)
        path.reverse()
        edgs.reverse()

        //  Trace back from w to base.
        while(bw !== bb) {
            //  Add bw to the new blossom.
            blossomparent.set(bw, b);
            path.push(bw)
            edgs.push({ from: labeledge.get(bw)!.to, to: labeledge.get(bw)!.from });
            assert(label.get(bw) == 2 || (
                label.get(bw) == 1 && labeledge.get(bw)!.from == mate.get(blossombase.get(bw)!)!)
            );
            //  Trace one step back.
            w = labeledge.get(bw)!.from;
            bw = inblossom.get(w)!;
        }

        //  Set label to S.
        assert(label.get(bb) == 1);
        label.set(b, 1);
        visualize?.pickNode(b, 'blue');
        labeledge.set(b, labeledge.get(bb)!);
        //  Set dual variable to zero.
        blossomdual.set(b, 0);

        //  Relabel vertices.
        for(const v of b.leaves()) {
            if(label.get(inblossom.get(v)!) == 2) {
                //  This T-vertex now turns into an S-vertex because it becomes
                //  part of an S-blossom; add it to the queue.
                queue.push(v);
            }
            inblossom.set(v, b);
        }

        //  Compute b.mybestedges.
        let bestedgeto = new Map<Vertex, Edge>();

        for(const bv of path) {
            let nblist: Edge[];
            if (bv instanceof Blossom) {
                if (bv.mybestedges) {
                    //  Walk this subblossom's least-slack edges.
                    nblist = bv.mybestedges
                    //  The sub-blossom won't need this data again.
                    bv.mybestedges = null;
                } else {
                    //  This subblossom does not have a list of least-slack
                    //  edges; get the information from the vertices.

                    nblist = [];
                    for (const v of bv.leaves()) {
                        for (const w of neighbors(v)) {
                            nblist.push({ from: v, to: w });
                        }
                    }
                }
            } else {
                nblist = [];
                for (const w of neighbors(bv)) {
                    nblist.push({ from: bv, to: w });
                }
            }
                
            for(let { from: i, to: j } of nblist) {
                if(inblossom.get(j) == b) {
                    ([i, j] = [j, i]);
                }
                    
                const bj = inblossom.get(j)!;
                if (
                    bj != b
                    && label.get(bj) == 1
                    && ((!bestedgeto.has(bj)) || slack({ from: i, to: j }) < slack(bestedgeto.get(bj)!))
                ) {
                    bestedgeto.set(bj, { from: i, to: j });
                }
            }

            //  Forget about least-slack edge of the subblossom.
            bestedge.delete(bv);
            console.log("remove least-slack edge from bestedge", bv);
        }

        b.mybestedges = [...bestedgeto.values()];

        //  Select bestedge[b].
        let mybestedge: Edge | null = null;
        let mybestslack: number = 0;
        bestedge.delete(b);

        for(const k of b.mybestedges) {
            const kslack = slack(k)
            if (!mybestedge || kslack < mybestslack) {
                mybestedge = k
                mybestslack = kslack
            }
        }

        bestedge.set(b, mybestedge!);
        console.log("Set bestedge to ", b, mybestedge);
    }

    //  Expand the given top-level blossom.
    function expandBlossom(b: Blossom, endstage: boolean) {
        console.log("expandBlossom", b);

        //  This is an obnoxiously complicated recursive function for the sake of
        //  a stack-transformation.  So, we hack around the complexity by using
        //  a trampoline pattern.  By yielding the arguments to each recursive
        //  call, we keep the actual callstack flat.

        function* _recurse(b: Blossom) {
            //  Convert sub-blossoms into top-level blossoms.
            for (const s of b.childs) {
                blossomparent.delete(s);
                if (s instanceof Blossom) {
                    if (endstage && blossomdual.get(s) == 0) {
                        //  Recursively expand this sub-blossom.
                        yield s;
                    } else {
                        for (const v of s.leaves()) {
                            inblossom.set(v, s);
                        }
                    }
                } else {
                    inblossom.set(s, s);
                }
            }

            //  If we expand a T-blossom during a stage, its sub-blossoms must be
            //  relabeled.
            if (!endstage && label.get(b) == 2) {
                //  Start at the sub-blossom through which the expanding
                //  blossom obtained its label, and relabel sub-blossoms until
                //  we reach the base.
                //  Figure out through which sub-blossom the expanding blossom
                //  obtained its label initially.
                let entrychild = inblossom.get(labeledge.get(b)!.to)!;
                //  Decide in which direction we will go round the blossom.
                let j = b.childs.indexOf(entrychild)
                let jstep = 0;
                if (j & 1) {
                    //  Start index is odd; go forward and wrap.
                    j -= b.childs.length
                    jstep = 1
                } else {
                    //  Start index is even; go backward.
                    jstep = -1
                }

                //  Move along the blossom until we get to the base.
                let { from: v, to: w } = labeledge.get(b)!;
                while (j != 0) {
                    //  Relabel the T-sub-blossom.
                    let p, q;
                    if (jstep == 1) {
                        ({ from: p, to: q } = b.edges[j]);
                    } else {
                        ({ from: q, to: p } = b.edges[j - 1]);
                    }
                    label.delete(w);
                    label.delete(q);
                    assignLabel(w, 2, v)
                    //  Step to the next S-sub-blossom and note its forward edge.
                    allowedge.add({ from: p, to: q });
                    
                    j += jstep
                    if (jstep == 1) {
                        ({ from: v, to: w } = b.edges[j]);
                    } else {
                        ({ from: w, to: v } = b.edges[j - 1]);
                    }
                    //  Step to the next T-sub-blossom.
                    allowedge.add({ from: v, to: w });

                    j += jstep
                }
                //  Relabel the base T-sub-blossom WITHOUT stepping through to
                //  its mate (so don't call assignLabel).
                let bw = b.childs[j % b.childs.length]
                label.set(w, 2)
                visualize?.pickNode(w, 'red');
                label.set(bw, 2)
                visualize?.pickNode(bw, 'red');
                const edge = { from: v, to: w }
                labeledge.set(w, edge)
                labeledge.set(bw, edge)
                bestedge.delete(bw)
                console.log("Relabeled T-sub-blossom", bw);

                //  Continue along the blossom until we get back to entrychild.
                j += jstep;
                while (b.childs[j] != entrychild) {
                    //  Examine the vertices of the sub-blossom to see whether
                    //  it is reachable from a neighboring S-vertex outside the
                    //  expanding blossom.
                    let bv = b.childs[j];
                    if (label.get(bv) == 1) {
                        //  This sub-blossom just got label S through one of its
                        //  neighbors; leave it be.
                        j += jstep;
                        continue
                    }

                    if (bv instanceof Blossom) {
                        for(const v of bv.leaves()) {
                            if (label.has(v))
                                break
                        }
                    } else {
                        v = bv;
                    }
                    //  If the sub-blossom contains a reachable vertex, assign
                    //  label T to the sub-blossom.
                    if (label.has(v)) {
                        assert(label.get(v) == 2);
                        assert(inblossom.get(v) == bv);
                        label.delete(v);
                        label.delete(mate.get(blossombase.get(bv)!)!);
                        assignLabel(v, 2, labeledge.get(v)!.from);
                    }
                    j += jstep;
                }
            }
            //  Remove the expanded blossom entirely.
            label.delete(b);
            labeledge.delete(b)
            bestedge.delete(b)
            blossomparent.delete(b)
            blossombase.delete(b)
            blossomdual.delete(b)
            console.log("Remove expanded blossom", b);
        }
        //  Now, we apply the trampoline pattern.  We simulate a recursive
        //  callstack by maintaining a stack of generators, each yielding a
        //  sequence of function arguments.  We grow the stack by appending a call
        //  to _recurse on each argument tuple, and shrink the stack whenever a
        //  generator is exhausted.
        let stack = [_recurse(b)]
        while (stack.length) {
            const top = stack.pop()!;
            for (const s of top) {
                stack.push(_recurse(s))
                break
            }
        }
    }

    //  Swap matched/unmatched edges over an alternating path through blossom b
    //  between vertex v and the base vertex. Keep blossom bookkeeping
    //  consistent.
    function augmentBlossom(b: Blossom, v: Vertex) {
        console.log("augmentBlossom", b, v);

        //  This is an obnoxiously complicated recursive function for the sake of
        //  a stack-transformation.  So, we hack around the complexity by using
        //  a trampoline pattern.  By yielding the arguments to each recursive
        //  call, we keep the actual callstack flat.

        function* _recurse(b: Blossom, v: Vertex) {
            //  Bubble up through the blossom tree from vertex v to an immediate
            //  sub-blossom of b.
            let t = v
            while (blossomparent.get(t) != b) {
                t = blossomparent.get(t)!;
            }
            //  Recursively deal with the first sub-blossom.
            if (t instanceof Blossom) {
                yield ([t, v] as const);
            }
            //  Decide in which direction we will go round the blossom.
            let i, j, jstep;
            i = j = b.childs.indexOf(t);
            if (i & 1) {
                //  Start index is odd; go forward and wrap.
                j -= b.childs.length;
                jstep = 1
            } else {
                //  Start index is even; go backward.
                jstep = -1
            }
            //  Move along the blossom until we get to the base.
            while (j != 0) {
                //  Step to the next sub-blossom and augment it recursively.
                j += jstep;
                t = b.childs[j];
                let w, x;
                if (jstep == 1) {
                    ({ from: w, to: x } = b.edges[j]);
                } else {
                    ({ from: x, to: w } = b.edges[j - 1]);
                }

                if (t instanceof Blossom) {
                    yield ([t, w] as const);
                }

                //  Step to the next sub-blossom and augment it recursively.
                j += jstep;
                t = b.childs[j];
                if (t instanceof Blossom) {
                    yield ([t, x] as const);
                }
                //  Match the edge connecting those sub-blossoms.
                mate.set(w, x)
                mate.set(x, w)
            }
            //  Rotate the list of sub-blossoms to put the new base at the front.
            b.childs = b.childs.slice(i).concat(b.childs.slice(0, i))
            b.edges = b.edges.slice(i).concat(b.edges.slice(0, i));
    
            blossombase.set(b, blossombase.get(b.childs[0])!);
            assert(blossombase.get(b) == v);
        }

        //  Now, we apply the trampoline pattern.  We simulate a recursive
        //  callstack by maintaining a stack of generators, each yielding a
        //  sequence of function arguments.  We grow the stack by appending a call
        //  to _recurse on each argument tuple, and shrink the stack whenever a
        //  generator is exhausted.
        const stack = [_recurse(b, v)]
        while (stack.length) {
            const top = stack.pop()!;
            for (const args of top) {
                stack.push(_recurse(...args))
            }
        }
    }

    //  Swap matched/unmatched edges over an alternating path between two
    //  single vertices. The augmenting path runs through S-vertices v and w.
    function augmentMatching(v: Vertex, w: Vertex) {
        for (let [s, j] of [[v, w], [w, v]]) {
            //  Match vertex s to vertex j. Then trace back from s
            //  until we find a single vertex, swapping matched and unmatched
            //  edges as we go.
            while (true)  {
                const bs = inblossom.get(s)!;
                assert(label.get(bs) == 1);
                assert (!labeledge.has(bs) && !mate.has(blossombase.get(bs)!) ||
                    labeledge.get(bs)!.from == mate.get(blossombase.get(bs)!)!
                );

                //  Augment through the S-blossom from s to base.
                if (bs instanceof Blossom) {
                    augmentBlossom(bs, s)
                }
                //  Update mate[s]
                mate.set(s, j);
                //  Trace one step back.
                if (!labeledge.has(bs)) {
                    //  Reached single vertex; stop.
                    break
                }
                let t = labeledge.get(bs)!.from;
                let bt = inblossom.get(t)!;
                assert(label.get(bt) == 2);
                
                //  Trace one more step back.
                ({ from: s, to: j } = labeledge.get(bt)!);
                //  Augment through the T-blossom from j to base.
                assert(blossombase.get(bt) == t);
                if (bt instanceof Blossom) {
                    augmentBlossom(bt, j)
                }
                //  Update mate[j]
                mate.set(j, s);
            }
        }
    }

    
    //  Main loop: continue until no further improvement is possible.
    while(true) {
        console.log("Mainloop step");

        //  Each iteration of this loop is a "stage".
        //  A stage finds an augmenting path and uses that to improve
        //  the matching.

        //  Remove labels from top-level blossoms/vertices.
        label.clear()
        labeledge.clear()

        //  Forget all about least-slack edges.
        bestedge.clear()
        for(const b of blossomdual.keys()) {
            (b as Blossom).mybestedges = null;
        }

        //  Loss of labeling means that we can not be sure that currently
        //  allowable edges remain allowable throughout this stage.
        allowedge.clear()

        //  Make queue empty.
        queue.splice(0);

        //  Label single blossoms/vertices with S and put them in the queue.
        for(const v of input.nodes) {
            if (!mate.has(v) && !label.has(inblossom.get(v)!)) {
                assignLabel(v, 1, null);
            }
        }

        //  Loop until we succeed in augmenting the matching.
        let delta = Infinity;
        let augmented = false;
        while(true) {
            //  Each iteration of this loop is a "substage".
            //  A substage tries to find an augmenting path;
            //  if found, the path is used to improve the matching and
            //  the stage ends. If there is no augmenting path, the
            //  primal-dual method is used to pump some slack out of
            //  the dual variables.

            //  Continue labeling until all vertices which are reachable
            //  through an alternating path have got a label.
            while(queue.length && !augmented) {
                visualize?.removeHighlighting();

                //  Take an S vertex from the queue.
                const v = queue.pop()!
                console.log("Queue Step", v);
                visualize?.message(`Processing Node ${v.id}`);
                visualize?.currentNode(v);

                assert(label.get(inblossom.get(v)!) == 1);

                //  Scan its neighbors:
                for(const w of neighbors(v)) {
                    visualize?.currentNode(v);
                    visualize?.currentEdge({ from: v, to: w, weight: -1 });

                    console.log("Scan neighbours", w);

                    const bv = inblossom.get(v)!;
                    const bw = inblossom.get(w)!;
                    if (bv === bw) {
                        //  this edge is internal to a blossom; ignore it
                        visualize?.message("Ignore blossom-internal edge");
                        yield;

                        continue;
                    }

                    let kslack = 0;
                    if (!allowedge.has({ from: v, to: w })) {
                        kslack = slack({ from: v, to: w });
                        if (kslack <= 0) {
                            //  edge k has zero slack => it is allowable
                            allowedge.add({from: v, to: w });
                        }
                    }

                    if (allowedge.has({ from: v, to: w })) {
                        if (!label.has(bw)) {
                            //  (C1) w is a free vertex;
                            //  label w with T and label its mate with S (R12).
                            assignLabel(w, 2, v);
                            
                            
                            visualize?.message(`Node ${w.id} is a free vertex, mark it as T and its mate ${v.id} with S`);
                            yield;
                        } else if (label.get(bw) == 1) {
                            //  (C2) w is an S-vertex (not in the same blossom);
                            //  follow back-links to discover either an
                            //  augmenting path or a new blossom.
                            const base = scanBlossom(v, w)
                            if (base !== NoNode) {
                                //  Found a new blossom; add it to the blossom
                                //  bookkeeping and turn it into an S-blossom.
                                addBlossom(base, v, w);

                                visualize?.message(`Found a new S-blossom around Node ${w.id}`);
                                yield;
                            } else {
                                //  Found an augmenting path; augment the
                                //  matching and end this stage.
                                augmentMatching(v, w);
                                augmented = true;

                                visualize?.message(`Found an augmented path from Vertex ${v.id} to Vertex ${w.id}`);
                                yield;

                                break
                            }
                        } else if (!label.has(w)) {
                            //  w is inside a T-blossom, but w itself has not
                            //  yet been reached from outside the blossom;
                            //  mark it as reached (we need this to relabel
                            //  during T-blossom expansion).
                            assert(label.get(bw) == 2);
                            label.set(w, 2);
                            visualize?.pickNode(w, 'red');
                            labeledge.set(w, { from: v, to: w });

                            visualize?.message(`Node ${w.id} is inside a T-blossom, mark it as reachable from Node ${w.id}`);
                            yield;
                        } else if (label.get(bw) == 1) {
                            //  keep track of the least-slack non-allowable edge to
                            //  a different S-blossom.
                            if (!bestedge.has(bv) || kslack < slack(bestedge.get(bv)!)) {
                                bestedge.set(bv, { from: v, to: w });
                                visualize?.message(`Found a new best edge to a different S-blossom from Node ${w.id} to Node ${v.id}`);
                                yield;
                            }
                        }
                    } else if (!label.has(w)) {
                        //  w is a free vertex (or an unreached vertex inside
                        //  a T-blossom) but we can not reach it yet;
                        //  keep track of the least-slack edge that reaches w.
                        if (!bestedge.has(w) || kslack < slack(bestedge.get(w)!)) {
                            bestedge.set(w, { from: v, to: w });
                            visualize?.message(`Found a new best edge to Node ${w.id}`);
                            yield;
                        }
                    }
                }
            }

            if (augmented)
                break

            console.log("No augmenting done");

            //  There is no augmenting path under these constraints;
            //  compute delta and reduce slack in the optimization problem.
            //  (Note that our vertex dual variables, edge slacks and delta's
            //  are pre-multiplied by two.)
            let deltatype = 1
            delta = Infinity;
            let deltaedge: Edge;
            let deltablossom: Blossom;

            //  Compute delta1: the minimum value of any vertex dual.
            for (const v of dualvar.values())
                delta = Math.min(delta, v);

            //  Compute delta2: the minimum slack on any edge between
            //  an S-vertex and a free vertex.
            for (const v of input.nodes) {
                console.log("Delta2 of ", v);
                if (!label.has(inblossom.get(v)!) && bestedge.has(v)) {
                    const d = slack(bestedge.get(v)!);
                    if (d < delta) {
                        delta = d
                        deltatype = 2
                        deltaedge = bestedge.get(v)!;
                    }
                }
            }

            //  Compute delta3: half the minimum slack on any edge between
            //  a pair of S-blossoms.
            for (const b of blossomparent.keys()) {
                if (
                    label.get(b) == 1
                    && bestedge.has(b)
                ) {
                    const kslack = slack(bestedge.get(b)!)
                    const d = kslack / 2.0;
                    if (d < delta) {
                        delta = d;
                        deltatype = 3;
                        deltaedge = bestedge.get(b)!;
                    }
                }
            }

            //  Compute delta4: minimum z variable of any T-blossom.
            for (const b of blossomdual.keys()) {
                if (
                    !blossomparent.has(b) &&
                    label.get(b) == 2
                    && blossomdual.get(b)! < delta) {
                        delta = blossomdual.get(b)!;
                        deltatype = 4;
                        deltablossom = b as Blossom;
                }
            }

            console.log("Delta", { delta, deltatype });

            //  Update dual variables according to delta.
            for(const v of input.nodes) {
                if (label.get(inblossom.get(v)!) == 1) {
                    //  S-vertex: 2*u = 2*u - 2*delta
                    dualvar.set(v, dualvar.get(v)! - delta);
                } else if (label.get(inblossom.get(v)!) == 2) {
                    //  T-vertex: 2*u = 2*u + 2*delta
                    dualvar.set(v, dualvar.get(v)! + delta);
                }
            }

            for (const b of blossomdual.keys()) {
                if (!blossomparent.has(b)) {
                    if (label.get(b) == 1) {
                        //  top-level S-blossom: z = z + 2*delta
                        blossomdual.set(b, blossomdual.get(b)! + delta);
                    } else if (label.get(b) == 2) {
                        //  top-level T-blossom: z = z - 2*delta
                        blossomdual.set(b, blossomdual.get(b)! - delta);
                    }
                }
            }

            visualize?.message("Updated Delta - " + deltatype + " - " + delta);
            yield;

            //  Take action at the point where minimum delta occurred.
            if (deltatype == 1) {
                //  No further improvement possible; optimum reached.
                console.log("Optimum reached");
                break;
            } else if (deltatype == 2) {
                //  Use the least-slack edge to continue the search.
                const { from: v, to: w } = deltaedge!;
                assert(label.get(inblossom.get(v)!) == 1);
                allowedge.add({ from: v, to: w });
                queue.push(v);
            } else if (deltatype == 3) {
                //  Use the least-slack edge to continue the search.
                const { from: v, to: w } = deltaedge!;
                allowedge.add({ from: v, to: w });
                assert(label.get(inblossom.get(v)!) == 1);
                queue.push(v)
            } else if (deltatype == 4) {
                //  Expand the least-z blossom.
                expandBlossom(deltablossom!, false);
            }

            //  End of a this substage.
            yield;
        }

        //  Paranoia check that the matching is symmetric.
        for (const v of mate.keys())
            assert(mate.get(mate.get(v)!)! == v);

        //  Stop when no more augmenting path can be found.
        // if (!augmented)
        //     break;
        // FIXME: 
        if (!delta) break;
        

        //  End of a stage; expand all S-blossoms which have zero dual.
        for (const b of [...blossomdual.keys()]) { // TODO: Copy needed?
            if (!blossomdual.has(b))
                continue;  //  already expanded

            if (!blossomparent.has(b) && label.get(b) == 1 && blossomdual.get(b) == 0) {
                expandBlossom(b as Blossom, true);
            }
        }
    }


    const matching: Matching = [];
    const inMatching = new EdgeSet(false);

    console.log("mates", mate);

    for (const [from, to] of mate.entries()) {
        if (inMatching.has({ from, to })) continue;
        inMatching.add({ from, to });

        visualize?.pickEdge({ from, to, weight: -1 }, "red");

        // TODO: Remove dupes
        matching.push({
            from,
            to,
            weight: weight({ from, to }, 0),
        });
    }

    console.log("matching", matching, inMatching);

    return matching;
}