import { AdjacencyList } from "../datastructures/adjacency_list";
import { Matcher, Matching, ReadonlyGraph, Visualizer, getScore } from "./base";

/* Patched Path Growing Matching (approximation, O(|E|))
 *
 * Unlike the Path Growing Matching, decide for solution one or two when finishing the current path,
 * and not overall.
 */
export const PathGrowingPatchedMatcher: Matcher = function* PathGrowingMatcher(input: ReadonlyGraph, visualize?: Visualizer) {
    visualize?.addLegend({
        "blue": "matching one",
        "red": "matching two",
        "yellow": "solution"
    });

    const solutionOne: Matching = [];
    visualize?.data("solution one", solutionOne);
    const solutionTwo: Matching = [];
    visualize?.data("solution two", solutionTwo);

    const adjacencyList = new AdjacencyList();
    visualize?.data("adjacency list", adjacencyList.adjacencyList);

    visualize?.step("1. Build adjacency list O(|E|)");
    yield* adjacencyList.fill(input, visualize);

    visualize?.step("2. Build paths O(|E|)");
    visualize?.message("Pick random node");

    const result: Matching = [];
    visualize?.data("result", result);

    for (let currentNode of input.nodes) {
        visualize?.message("Pick random node")
        while(true) {
            visualize?.currentNode(currentNode);
            yield;

            const departingEdges = adjacencyList.edgesOf(currentNode)!;
            if (departingEdges.length === 0) {
                break;
            }

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
            if (visualize) {
                for (const edge of solutionOne) {
                    visualize.pickEdge(edge, 'yellow');
                }
                for (const edge of solutionTwo) {
                    visualize.pickEdge(edge, null);
                }
            }
            result.push(...solutionOne.splice(0));
            solutionTwo.splice(0);
        } else {
            visualize?.step(`3. Pick solution two as it has better score (${twoScore} vs ${oneScore}))`);
            if (visualize) {
                for (const edge of solutionOne) {
                    visualize.pickEdge(edge, null);
                }
                for (const edge of solutionTwo) {
                    visualize.pickEdge(edge, 'yellow');
                }
            }
            result.push(...solutionTwo.splice(0));
            solutionOne.splice(0);
        }
    }

    return result;
}