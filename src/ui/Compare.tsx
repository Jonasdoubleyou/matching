import { useRef, useState } from "react";
import { MatcherName, RunResult, matcherNames, matchers, run } from "../algo";
import { IconButton } from "./base/Icons";
import { generateRandomMission } from "../test/random";
import { Column, Row, Spacer } from "./base/Layout";
import { Chart, registerables } from 'chart.js';
import { Bar, Scatter } from "react-chartjs-2";
Chart.register(...registerables);

// Prevent overlaps in the Scatter chart
// c.f. https://stackoverflow.com/questions/57732359/chartjs-handling-of-overlapping-points-in-line-chart
Chart.register({
    id: 'jitterEffects',
    beforeDatasetDraw: function (ctx, args) {
        var _args = args,
            dataIndex = _args.index,
            meta = _args.meta;
        var points = meta.data.map(function (el) {
            return {
                x: el.x,
                y: el.y
            };
        });
        var dsLength = ctx.data.datasets.length;
        var adjustedMap = []; // keeps track of adjustments to prevent double offsets

        for (var datasetIndex = 0; datasetIndex < dsLength; datasetIndex += 1) {
            if (dataIndex !== datasetIndex) {
                var datasetMeta = ctx.getDatasetMeta(datasetIndex);
                for (const el of datasetMeta.data) {
                    var overlapFilter = points.filter(function (point) {
                        return point.x === el.x && point.y === el.y;
                    });

                    var overlap = false;
                    var overObj = JSON.parse(JSON.stringify(overlapFilter));
                    for (var i = 0; i < overObj.length; i++) {
                        if(overObj[i]['x'] === el.x && overObj[i]['y'] === el.y){
                            overlap = true;
                            break;
                        }
                    }
                    if (overlap) {
                        var adjusted = false;
                        var adjustedFilter = adjustedMap.filter(function (item) {
                            return item.datasetIndex === datasetIndex && item.dataIndex === dataIndex;
                        });
                        var adjObj = JSON.parse(JSON.stringify(adjustedFilter));
                        for (var i = 0; i < adjObj.length; i++) {
                            if(adjObj[i]['datasetIndex'] === datasetIndex && adjObj[i]['dataIndex'] === dataIndex){
                                adjusted = true;
                                break;
                            }
                        }

                        if (!adjusted && datasetIndex % 2) {
                            el.x += 7;
                        } else {
                            el.x -= 7;
                        }

                        adjustedMap.push({
                            datasetIndex: datasetIndex,
                            dataIndex: dataIndex
                        });
                    }
                }
            }
        }
    }
});

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
        matchers: ["BlossomMatcher", "GreedyMatcher", "PathGrowingPatchedMatcher", "TreeGrowingMatcher"],
        runs: [
            {
                name: "60% edge rate",
                nodeCount: 200,
                edgeRate: 60,
                randomRepeat: 20,
                repeat: 1
            },
            {
                name: "70% edge rate",
                nodeCount: 200,
                edgeRate: 70,
                randomRepeat: 20,
                repeat: 1
            },
            {
                name: "80% edge rate",
                nodeCount: 200,
                edgeRate: 80,
                randomRepeat: 20,
                repeat: 1
            },
            {
                name: "100% edge rate",
                nodeCount: 200,
                edgeRate: 100,
                randomRepeat: 20,
                repeat: 1
            }

        ]
    },

    {
        name: "Growing number of nodes, 50% edge rate",
        matchers: ["BlossomMatcher", "GreedyMatcher", "PathGrowingMatcher", "PathGrowingPatchedMatcher", "TreeGrowingMatcher"],
        runs: [
            {
                name: "200 nodes",
                nodeCount: 200,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
            {
                name: "400 nodes",
                nodeCount: 400,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
            {
                name: "600 nodes",
                nodeCount: 600,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
            {
                name: "800 nodes",
                nodeCount: 800,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
        ]
    },

    {
        name: "Overhead of iterators",
        matchers: ["BlossomMatcher", "TreeGrowingMatcher", "TreeGrowingSyncMatcher"],
        runs: [
            {
                name: "50 nodes",
                nodeCount: 50,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
            {
                name: "100 nodes",
                nodeCount: 100,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
            {
                name: "150 nodes",
                nodeCount: 150,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
            {
                name: "200 nodes",
                nodeCount: 200,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
            {
                name: "250 nodes",
                nodeCount: 250,
                edgeRate: 50,
                randomRepeat: 10,
                repeat: 1
            },
        ]
    },

    {
        name: "Sparse - Path Growing",
        matchers: ["PathGrowingMatcher", "PathGrowingPatchedMatcher", "BlossomMatcher"],
        runs: [
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
            {
                name: "15% edge rate",
                nodeCount: 100,
                edgeRate: 15,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "20% edge rate",
                nodeCount: 100,
                edgeRate: 20,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "25% edge rate",
                nodeCount: 100,
                edgeRate: 25,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "30% edge rate",
                nodeCount: 100,
                edgeRate: 30,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "35% edge rate",
                nodeCount: 100,
                edgeRate: 35,
                randomRepeat: 5,
                repeat: 1
            },
            {
                name: "40% edge rate",
                nodeCount: 100,
                edgeRate: 40,
                randomRepeat: 5,
                repeat: 1
            },
        ]
    },
];

type Measure = { mean: number, stdDeviation: number };

type BenchmarkResult = RunResult & { run: number, matcher: MatcherName, benchmarkRun: BenchmarkRun, performanceRatio: number };

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
                                run: repeat + benchmarkRun.repeat * randomRepeat,
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
                data: results.filter(it => it.matcher === matcher).map(it => ({ x: it.benchmarkRun.name + " " + it.run, y: it.performanceRatio })),
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
                data: results.filter(it => it.matcher === matcher).map(it => ({ x: it.benchmarkRun.name,  y: it.runtime })),
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
