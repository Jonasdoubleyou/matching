import { AdjacencyList } from "../datastructures/adjacency_list";
import { assert } from "../util/assert";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer, getScore } from "./base";

/* Path Growing Matching
 *
 * Builds an adjacency list, to easily navigate along paths in the graph.
 * Then picks a random node, unlinks the node and all edges departing from it from the adjacency list,
 * and then follows along the heaviest edge. Thus it creates a path in which all nodes only appear once,
 * and which is relatively heavy (?). By taking the even or uneven edges in the path,
 * one can get two different matchings, and choose the one with higher score. 
 */
export const PathGrowingMatcher: Matcher = function* PathGrowingMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    const solutionOne: Matching = [];
    visualize?.data("solution one", solutionOne);
    const solutionTwo: Matching = [];
    visualize?.data("solution two", solutionTwo);

    const adjacencyList = new AdjacencyList();
    visualize?.data("adjacency list", adjacencyList);

    visualize?.step("1. Build adjacency list O(|E|)");
    yield* adjacencyList.fill(input.edges, visualize);

    visualize?.step("2. Build paths O(|E|)");
    visualize?.message("Pick random node");

    while(!adjacencyList.empty()) {
        visualize?.message("Pick random node")
        let currentNode = adjacencyList.popNode();
        while(true) {
            visualize?.currentNode(currentNode);
            yield;

            const departingEdges = adjacencyList.edgesOf(currentNode)!;
            const heaviestEdge = departingEdges.reduce((a, b) => a.weight > b.weight ? a : b);
            visualize?.currentEdge(heaviestEdge);
            yield;

            if (solutionOne.length < solutionTwo.length) {
                solutionOne.push(heaviestEdge);
                visualize?.pickEdge(heaviestEdge, "blue");
            } else {
                solutionTwo.push(heaviestEdge);
                visualize?.pickEdge(heaviestEdge, "red");
            }
            yield;

            visualize?.message("Unlink current node from adjacency list");
            yield* adjacencyList.remove(currentNode);

            currentNode = heaviestEdge.from === currentNode ? heaviestEdge.to : heaviestEdge.from;
            if (!adjacencyList.has(currentNode)) {
                break;
            }

            visualize?.message("Follow edge to next node");
        }
    }

    const oneScore = getScore(solutionOne);
    const twoScore = getScore(solutionTwo);
    if (oneScore > twoScore) {
        visualize?.step(`3. Pick solution one as it has better score (${oneScore} vs ${twoScore}))`);
        return solutionOne;
    } else {
        visualize?.step(`3. Pick solution two as it has better score (${twoScore} vs ${oneScore}))`);
        return solutionTwo;
    }
}