import { GreedyMatcher } from "./greedy";
import { PathGrowingMatcher } from "./path_growing";
import { NaiveMatcher } from "./naive";
import { BlossomMatcher } from "./blossom";
import { PathGrowingPatchedMatcher } from "./path_growing_patched";

export * from "./base";
export { GreedyMatcher } from "./greedy";


export const matchers = {
    GreedyMatcher,
    PathGrowingMatcher,
    NaiveMatcher,
    BlossomMatcher,
    PathGrowingPatchedMatcher
} as const;

export type MatcherName = keyof typeof matchers;
export const matcherNames: MatcherName[] = Object.keys(matchers) as any;