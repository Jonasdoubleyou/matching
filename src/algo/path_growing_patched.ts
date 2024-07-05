import { AdjacencyList } from "../datastructures/adjacency_list";
import { assert } from "../util/assert";
import { EdgeBase, Matcher, Matching, NodeBase, ReadonlyGraph, Visualizer, getScore } from "./base";

/* Patched Path Growing Matching
 *
 * Unlike the Path Growing Matching, decide for solution one or two when finishing the current path,
 * and not overall.
 */
export const PathGrowingPatchedMatcher: Matcher = function* PathGrowingMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    const solutionOne: Matching = [];
    visualize?.data("solution one", solutionOne);
    const solutionTwo: Matching = [];
    visualize?.data("solution two", solutionTwo);

    const adjacencyList = new AdjacencyList();
    visualize?.data("adjacency list", adjacencyList.adjacencyList);

    visualize?.step("1. Build adjacency list O(|E|)");
    yield* adjacencyList.fill(input.edges, visualize);

    visualize?.step("2. Build paths O(|E|)");
    visualize?.message("Pick random node");

    const result: Matching = [];
    visualize?.data("result", result);

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

        const oneScore = getScore(solutionOne);
        const twoScore = getScore(solutionTwo);
        if (oneScore > twoScore) {
            visualize?.step(`3. Pick solution one as it has better score (${oneScore} vs ${twoScore}))`);
            result.push(...solutionOne.splice(0));
            solutionTwo.splice(0);
        } else {
            visualize?.step(`3. Pick solution two as it has better score (${twoScore} vs ${oneScore}))`);
            result.push(...solutionTwo.splice(0));
            solutionOne.splice(0);
        }
    }

    return result;
}