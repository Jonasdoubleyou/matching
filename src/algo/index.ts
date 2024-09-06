import { GreedyMatcher } from "./greedy";
import { PathGrowingMatcher } from "./path_growing";
import { NaiveMatcher } from "./naive";
import { BlossomMatcher } from "./blossom";
import { PathGrowingPatchedMatcher } from "./path_growing_patched";
import { TreeGrowingMatcher } from "./tree_growing";
import { TreeGrowingSyncMatcher } from "./tree_growing_sync";

export * from "./base";
export { GreedyMatcher } from "./greedy";


export const matchers = {
    GreedyMatcher,
    PathGrowingMatcher,
    PathGrowingPatchedMatcher,
    NaiveMatcher,
    BlossomMatcher,
    TreeGrowingMatcher,
    TreeGrowingSyncMatcher
} as const;

export type MatcherName = keyof typeof matchers;
export const matcherNames: MatcherName[] = Object.keys(matchers) as any;