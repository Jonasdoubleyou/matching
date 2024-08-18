import { useRef, useState } from "react";
import { MatcherName, RunResult, matcherNames, matchers, run } from "../algo";
import { IconButton } from "./base/Icons";
import { generateRandomMission } from "../test/random";
import { Column, Row, Spacer } from "./base/Layout";
import { Chart, registerables } from 'chart.js';
import { Bar, Scatter } from "react-chartjs-2";
Chart.register(...registerables);

const Graph = Scatter;

interface BenchmarkRun {
    name: string;
    nodeCount: number;
    edgeRate: number;
    repeat: number;
    randomRepeat: number;
}

interface Benchmark {
    name: string;
    runs: BenchmarkRun[];
    matchers: MatcherName[];
    runtimeScale?: "linear" | "logarithmic";
}

const benchmarks: Benchmark[] = [
    {
        name: "Growing number of edges / Sparse",
        matchers: matcherNames,
        runs: [
            {
                name: "1% edge rate",
                nodeCount: 100,
                edgeRate: 1,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "2% edge rate",
                nodeCount: 100,
                edgeRate: 2,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "3% edge rate",
                nodeCount: 100,
                edgeRate: 3,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "4% edge rate",
                nodeCount: 100,
                edgeRate: 4,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "5% edge rate",
                nodeCount: 100,
                edgeRate: 5,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "10% edge rate",
                nodeCount: 100,
                edgeRate: 10,
                randomRepeat: 5,
                repeat: 1
            },

        ]
    },

    {
        name: "Growing number of edges (small)",
        matchers: matcherNames,
        runtimeScale: "logarithmic",
        runs: [
            {
                name: "10% edge rate",
                nodeCount: 20,
                edgeRate: 10,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "20% edge rate",
                nodeCount: 20,
                edgeRate: 20,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "30% edge rate",
                nodeCount: 20,
                edgeRate: 30,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "40% edge rate",
                nodeCount: 20,
                edgeRate: 40,
                randomRepeat: 5,
                repeat: 1
            }

        ],
    },

    {
        name: "Growing number of edges / Interconnected",
        matchers: ["BlossomMatcher", "GreedyMatcher", "PathGrowingMatcher", "PathGrowingPatchedMatcher", "TreeGrowingMatcher"],
        runs: [
            {
                name: "60% edge rate",
                nodeCount: 100,
                edgeRate: 60,
                randomRepeat: 20,
                repeat: 1
            },
            {
                name: "70% edge rate",
                nodeCount: 100,
                edgeRate: 70,
                randomRepeat: 20,
                repeat: 1
            },
            {
                name: "80% edge rate",
                nodeCount: 100,
                edgeRate: 80,
                randomRepeat: 20,
                repeat: 1
            },
            {
                name: "100% edge rate",
                nodeCount: 100,
                edgeRate: 100,
                randomRepeat: 20,
                repeat: 1
            }

        ]
    },


    {
        name: "Sparse - Path Growing",
        matchers: ["PathGrowingMatcher", "PathGrowingPatchedMatcher"],
        runs: [
            {
                name: "1% edge rate",
                nodeCount: 100,
                edgeRate: 1,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "2% edge rate",
                nodeCount: 100,
                edgeRate: 2,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "3% edge rate",
                nodeCount: 100,
                edgeRate: 3,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "4% edge rate",
                nodeCount: 100,
                edgeRate: 4,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "5% edge rate",
                nodeCount: 100,
                edgeRate: 5,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "10% edge rate",
                nodeCount: 100,
                edgeRate: 10,
                randomRepeat: 5,
                repeat: 1
            },

        ]
    },
];

type Measure = { mean: number, stdDeviation: number };

type BenchmarkResult = RunResult & { matcher: MatcherName, benchmarkRun: BenchmarkRun, performanceRatio: number };

interface AggregatedRunResult {
    benchmarkRun: BenchmarkRun;
    matcher: MatcherName;

    steps: Measure;
    runtime: Measure;
    performanceRatio: Measure;
}

function computeMeasure(values: number[]): Measure {
    let sum = 0;
    for (const v of values) sum += v;

    const mean = sum / values.length;

    let stdDeviation = 0;
    for (const v of values) stdDeviation += (v - mean) ** 2;
    stdDeviation = Math.sqrt(stdDeviation);

    console.log("computeMeasure", values, sum, mean, stdDeviation);

    return { mean, stdDeviation };
}

export function CompareUI({ exit }: { exit: () => void }) {
    const [results, setResults] = useState<BenchmarkResult[]>([]);
    const [aggregatedResults, setAggregatedResults] = useState<AggregatedRunResult[]>([]);

    const [benchmark, setBenchmark] = useState<Benchmark>();

    const [status, setStatus] = useState("");
    const running = useRef<number>(0);
    const abort = () => running.current = 0;

    function runAll(benchmark: Benchmark) {
        if (running.current) return;
        const currentRun = Date.now();
        running.current = currentRun;
        setBenchmark(benchmark);
        setResults([]);
        setAggregatedResults([]);

        (async function () {
            const results: BenchmarkResult[] = [];

            for (const benchmarkRun of benchmark.runs) {
                for (let randomRepeat = 0; randomRepeat < benchmarkRun.randomRepeat; randomRepeat++) {
                    const mission = generateRandomMission(benchmarkRun.nodeCount, benchmarkRun.edgeRate);

                    const partResults = [];

                    for (const matcherName of benchmark.matchers) {
                        for (let repeat = 0; repeat < benchmarkRun.repeat; repeat++) {
                            if (running.current !== currentRun) return;

                            setStatus(`${benchmarkRun.name} - ${randomRepeat + 1} / ${benchmarkRun.randomRepeat} - ${matcherName} - ${repeat +1} / ${benchmarkRun.repeat}`);
                            await new Promise(res => setTimeout(res, 50));

                            console.log(`Run ${matcherName}`);
                            const data = await run(mission.input, matchers[matcherName]);

                            const result = {
                                ...data,
                                matcher: matcherName,
                                benchmarkRun
                            };

                            partResults.push(result);
                        }
                        
                    }

                    const bestScore = Math.max(...partResults.map(it => it.score));
                    results.push(...partResults.map(it => ({ ...it, performanceRatio: it.score / bestScore })));
                }
            }

            const grouped = new Map<string, BenchmarkResult[]>();
            for (const result of results) {
                const aggKey = result.benchmarkRun.name + " - " + result.matcher;
                if (!grouped.has(aggKey)) grouped.set(aggKey, []);
                grouped.get(aggKey)!.push(result);
            }

            const aggregated: AggregatedRunResult[] = [...grouped.values()].map(group => ({
                benchmarkRun: group[0].benchmarkRun,
                matcher: group[0].matcher,
                performanceRatio: computeMeasure(group.map(it => it.performanceRatio)),
                runtime: computeMeasure(group.map(it => it.runtime!)),
                steps: computeMeasure(group.map(it => it.steps))
            }))

            running.current = 0;
            setResults(results);
            setAggregatedResults(aggregated);
            setStatus("Finished");
        })();

        return () => { running.current = 0; };
    }

    return <div>
        <Row>
            <IconButton icon="cancel" onClick={() => { exit(); abort(); }} text='Zurück' />
            <IconButton icon="cancel" disabled={running.current === 0} onClick={() => { exit(); abort(); }} text='Abbrechen' />
            <Spacer />
            {benchmarks.map(it => <IconButton icon="play_arrow" disabled={running.current !== 0} onClick={() => runAll(it)} text={`Start ${it.name}`} />)}
            <Spacer />
        </Row>

        <Row>
            <Spacer />
        {status && benchmark && <>
         <h3>{benchmark.name}</h3>
         <h4>{status}</h4>
        </>}
            <Spacer />
        </Row>

        <Row>
            <Spacer />
            <Column>
                <h2>Results</h2>
                {results.length > 0 && <>
                    <table>
                    <tr>
                        <th>Run</th>
                        <th>Matcher</th>
                        <th>Steps</th>
                        <th>Score</th>
                        <th>Duration</th>
                        <th>Performance Ratio</th>
                    </tr>
                {results.map(result => 
                    <tr>
                        <td>{result.benchmarkRun.name}</td>
                        <td>{result.matcher}</td>
                        <td>{result.steps}</td>
                        <td>{result.score}</td>
                        <td>{result.runtime?.toFixed(2)}ms</td>
                        <td>{result.performanceRatio.toFixed(2)}</td>
                    </tr>    
                )}
                </table>
                </>}
            </Column>
            <Column>
                    <h2>Aggregated</h2>
                    {aggregatedResults.length > 0 && <>
                    <table>
                    <tr>
                        <th>Run</th>
                        <th>Matcher</th>
                        <th>Steps</th>
                        <th>Duration</th>
                        <th>Performance Ratio</th>
                    </tr>
                {aggregatedResults.map(result => 
                    <tr>
                        <td>{result.benchmarkRun.name}</td>
                        <td>{result.matcher}</td>
                        <td>{result.steps.mean.toFixed(2)} ({result.steps.stdDeviation.toFixed(2)})</td>
                        <td>{result.runtime.mean.toFixed(2)}ms ({result.runtime.stdDeviation.toFixed(2)})</td>
                        <td>{result.performanceRatio.mean.toFixed(2)} ({result.performanceRatio.stdDeviation.toFixed(2)})</td>
                    </tr>    
                )}
                </table>
                </>}
            </Column>
            <Spacer />
        </Row>

        <Row>
            <Spacer />
            <Column grow>
            <h2>Performance Ratio</h2>
            {results.length > 0 && <Graph data={{ datasets: matcherNames.map(matcher => ({
                label: matcher,
                data: results.filter(it => it.matcher === matcher).map(it => ({ x: it.benchmarkRun.name, y: it.performanceRatio })),
             })).filter(it => it.data.length) }} options={{
                scales: {
                    x: {
                      type: 'category',
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: false
                      }
                  }
            }} />}
            </Column>
            <Column grow>
            <h2>Runtime</h2>
            {results.length > 0 && <Graph data={{ datasets: matcherNames.map(matcher => ({
                label: matcher,
                data: results.filter(it => it.matcher === matcher).map(it => ({ x: it.benchmarkRun.name, y: it.runtime })),
             })).filter(it => it.data.length) }} options={{
                scales: {
                    x: {
                      type: 'category',
                    },
                    y: {
                        type: benchmark?.runtimeScale ?? "linear",
                        position: 'left',
                        beginAtZero: false
                      }
                  }
            }} />}
            </Column>

            
            <Spacer />
        </Row>
        

        
        
    </div>;
}
