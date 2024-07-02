import { GreedyMatcher } from "./greedy";
import { PathGrowingMatcher } from "./path_growing";
import { NaiveMatcher } from "./naive";

export * from "./base";
export { GreedyMatcher } from "./greedy";


export const matchers = {
    GreedyMatcher,
    PathGrowingMatcher,
    NaiveMatcher
} as const;

export type MatcherName = keyof typeof matchers;
export const matcherNames: MatcherName[] = Object.keys(matchers) as any;