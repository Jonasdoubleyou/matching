import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { IconButton } from './base/Icons';
import { Select } from './base/Select';
import { Mission, missions } from '../test/missions';
import { Column, Row, Spacer } from './base/Layout';
import { CancellationToken, Matcher, MatcherName, Matching, RunResult, Visualizer, getScore, matcherNames, matchers, run, runAsync } from '../algo';
import { StateUI, VisualizeContext, useVisualizer } from './Visualizer';
import { GraphUI } from './graph/Graph';
import { NumberInput } from './base/NumberInput';
import { generateRandomMission } from '../test/random';

function Start({ startRun }: { startRun: (matcher: MatcherName | undefined, mission: Mission, mode: "visualize" | "compare") => void }) {
    const [mission, setMission] = useState<Mission>();
    const [matcher, setMatcher] = useState<MatcherName>();

    const [nodeCount, setNodeCount] = useState<number>(0);
    const [edgeCount, setEdgeCount] = useState<number>(0);

    // Selected Mission and Random Mission are mutually exclusive:
    useEffect(() => { if(nodeCount || edgeCount) { setMission(undefined); } }, [nodeCount, edgeCount]);
    useEffect(() => { if(mission) { setNodeCount(0); setEdgeCount(0); } }, [mission]);


    function start(mode: "visualize" | "compare") {
        return function() {
            if (mission) {
                startRun(matcher, mission!, mode);
            } else {
                startRun(matcher, generateRandomMission(nodeCount, edgeCount), mode);
            }
        }
    }


    const hasMission = mission || (nodeCount && edgeCount);

    return (
        <div className="start">
            <h1>Weighted Matching</h1>
            <p>
                Projektarbeit 1 / Jonas Wilms / HKA
            </p>

            <Column>
            <Row grow>
                <Spacer />
                <Select placeholder="<Matcher>" selected={matcher} options={matcherNames} onChange={setMatcher} />
                <Spacer />
            </Row>
            <Row>
                <Column>
                    <h3>Predefined Mission</h3>
                    <Select placeholder="<Mission>" options={missions} onChange={setMission} selected={mission} map={it => it.name} />
                </Column>
                <Spacer />
                <Column>
                    <h3>Random Mission</h3>
                    <NumberInput placeholder='Nodes' value={nodeCount} setValue={setNodeCount} />
                    <NumberInput placeholder='Edges' value={edgeCount} setValue={setEdgeCount} />
                </Column>
            </Row>
            <Row>
                <Spacer />
                <IconButton disabled={!matcher || !hasMission} icon="play_arrow" text="Start" onClick={start("visualize")} />
                <IconButton disabled={!hasMission} icon="play_arrow" text="Compare" onClick={start("compare")} />
                <Spacer />
            </Row>
            </Column>
            
        </div>
      );
}

interface MatchRun {
    matcher: MatcherName;
    mission: Mission;
}

interface MatchRunState {
    runner: Generator<void, Matching>;
}


function initRun(run: MatchRun, visualizer: Visualizer): MatchRunState {
    const matcher = matchers[run.matcher];

    console.log(`Initializing runner`);
    const runner = matcher(
           run.mission.input,
           visualizer
    );

    return { runner };
}

function RunUI({ run, exit }: { run: MatchRun, exit: () => void }) {
    const { visualizer, states } = useVisualizer();
    const [undoCount, setUndoCount] = useState(0);

    const [result, setResult] = useState<{ step: number, result?: Matching }>({ step: 0 });
    const runState = useMemo(() => initRun(run, visualizer), [run, visualizer, setResult]);
    const [intervalID, setIntervalID] = useState<{ id: any }>();
    const running = !!intervalID;

    const currentStep = states.length - undoCount;
    const currentState = states[currentStep - 1];

    const finalScore = useMemo(() => result?.result && getScore(result?.result), [result]);
    const isBest = run.mission.bestScore === finalScore;

    function next() {
        if (result.result) return;

        console.log(`Advancing`);
        const { value, done } = runState.runner.next();
        visualizer.commit();

        setResult({ step: result.step + 1, result: done ? value : undefined });

        if (done) pause();
    }

    function cancel() {
        pause();
        exit();
    }

    function play(stepTime = 1000) {
        if (intervalID) return;
        setUndoCount(0);

        console.log(`Playing`);
        setIntervalID({ id: setInterval(next, stepTime) });
    }

    function pause() {
        setIntervalID((prev) => {
            if (prev) clearInterval(prev.id);
            return undefined;
        });
    }

    function undo() {
        pause();
        setUndoCount(it => Math.min(states.length, it + 1));
    }

    function redo() {
        if (undoCount === 0) {
            next();
        } else {
            setUndoCount(it => Math.max(0, it - 1));
        }
    }

    function runToEnd() {
        pause();
        play(10);
    }

    return <div className="run">
        <Row>
            <Spacer />
                <IconButton icon="cancel" onClick={cancel} text='Cancel' />
                <div>{run.matcher} / {run.mission.name}</div>
                <Spacer />
                <IconButton icon="arrow_back" disabled={currentStep === 0} onClick={undo} text='Previous' />
                <div>{currentStep}</div>
                <IconButton icon="arrow_forward" disabled={result.result && undoCount === 0} onClick={redo} text={undoCount === 0 ? 'Advance' : 'Redo'} />
                <Spacer />
                <IconButton icon="pause" disabled={!running} onClick={pause} text="Pause" />
                <IconButton icon="play_arrow" disabled={running || !!result.result} onClick={() => play()} text='Play' />
                <IconButton icon="play_arrow" disabled={!!result.result} onClick={runToEnd} text='Run to End' />
            <Spacer />
        </Row>

        <Row>
            <Spacer />
            <Row grow>
                <h3>{currentState?.step ?? ""}</h3>
            </Row>
            <Row grow>
                <h4>{currentState?.message ?? ""}</h4>
            </Row>
            <Row grow>
                {result?.result && <>
                    <h2 style={{ color: isBest ? "lightgreen" : "orange" }}>Score: {finalScore} / {run.mission?.bestScore ?? "?"}</h2>
                </>}
            </Row>
            <Spacer />
        </Row>
        

        <Row>
            <Spacer />
            <VisualizeContext state={currentState}>
                <Column grow>
                    <h2>Graph</h2>
                    <GraphUI graph={run.mission.input} />
                </Column>
                <Column grow>
                    <h2>State</h2>
                    <StateUI />
                </Column>
            </VisualizeContext>     
            <Spacer />
        </Row>  
    </div>;
}

function CompareUI({ mission, exit }: { mission: Mission, exit: () => void }) {
    const [results, setResults] = useState<(RunResult & { matcher: MatcherName, score: number, duration: number })[]>([]);
    
    const running = useRef<number>(0);
    const abort = () => running.current = 0;

    function runAll() {
        if (running.current) return;
        const currentRun = Date.now();
        running.current = currentRun;

        (async function () {
            for (const [name, matcher] of Object.entries(matchers)) {
                if (running.current !== currentRun) return;

                const start = performance.now();
                const { matching, steps } = run(mission.input, matcher);
                const duration = performance.now() - start;

                const result = {
                    matching,
                    steps,
                    score: getScore(matching),
                    matcher: name as MatcherName,
                    duration
                };

                setResults(prev => [...prev, result]);

                await new Promise(res => setTimeout(res, 10));
            }
            running.current = 0;
        })();

        return () => { running.current = 0; };
    }

    return <div>
        <IconButton icon="cancel" onClick={() => { exit(); abort(); }} text='Zurück' />
        <IconButton icon="cancel" onClick={() => { exit(); abort(); }} text='Abbrechen' />
        <IconButton icon="play_arrow" onClick={runAll} text='Start' />
        <table>
            <tr>
                <th>Matcher</th>
                <th>Schritte</th>
                <th>Score</th>
                <th>Dauer</th>
            </tr>
        {results.map(result => 
            <tr>
                <td>{result.matcher}</td>
                <td>{result.steps}</td>
                <td>{result.score}</td>
                <td>{result.duration.toFixed(2)}ms</td>
            </tr>    
        )}
        </table>
    </div>;
}

function App() {
    const [run, setRun] = useState<MatchRun>();
    const [compare, setCompare] = useState<Mission>();

    function startRun(matcher: MatcherName | undefined, mission: Mission, mode: "visualize" | "compare") {
        if (mode === "visualize") {
            setRun({
                matcher: matcher!,
                mission
            });
        } else {
            setCompare(mission);
        }
    }

    if (run) return <RunUI run={run} exit={() => setRun(undefined)} />;
    if (compare) return <CompareUI mission={compare} exit={() => setCompare(undefined)} />;

    return <div className="app">
        <Start startRun={startRun} />
    </div>;
}

export default App;
