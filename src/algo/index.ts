import { GreedyMatcher } from "./greedy";
import { PathGrowingMatcher } from "./path_growing";
import { NaiveMatcher } from "./naive";
import { BlossomMatcher } from "./blossom";

export * from "./base";
export { GreedyMatcher } from "./greedy";


export const matchers = {
    GreedyMatcher,
    PathGrowingMatcher,
    NaiveMatcher,
    BlossomMatcher
} as const;

export type MatcherName = keyof typeof matchers;
export const matcherNames: MatcherName[] = Object.keys(matchers) as any;