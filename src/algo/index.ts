import { Matcher } from "./base";
import { GreedyMatcher } from "./greedy";

export * from "./base";
export { GreedyMatcher } from "./greedy";


export const matchers = {
    GreedyMatcher
} as const;

export type MatcherName = keyof typeof matchers;
export const matcherNames: MatcherName[] = Object.keys(matchers) as any;