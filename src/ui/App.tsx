import React, { useMemo, useState } from 'react';
import './App.css';
import { IconButton } from './base/Icons';
import { Select } from './base/Select';
import { Mission, missions } from '../test/missions';
import { Row, Spacer } from './base/Layout';
import { CancellationToken, Matcher, MatcherName, Matching, RunResult, Visualizer, getScore, matcherNames, matchers, runAsync } from '../algo';
import { VisualizeUI, useVisualizer } from './Visualizer';

function Start({ startRun }: { startRun: (matcher: MatcherName, mission: Mission) => void }) {
    const [mission, setMission] = useState<Mission>();
    const [matcher, setMatcher] = useState<MatcherName>();

    return (
        <div className="start">
            <h1>Weighted Matching</h1>
            <p>
                Projektarbeit 1 / Jonas Wilms / HKA
            </p>

            <Row>
                <Spacer />
                <Select placeholder="<Mission>" options={missions} onChange={setMission} map={it => it.name} />
                <Select placeholder="<Matcher>" options={matcherNames} onChange={setMatcher} />
                <IconButton disabled={!matcher || !mission} icon="play_arrow" text="Start" onClick={() => startRun(matcher!, mission!)} />
                <Spacer />
            </Row>
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

    function play() {
        if (intervalID) return;
        setUndoCount(0);

        console.log(`Playing`);
        setIntervalID({ id: setInterval(next, 1000) });
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

    return <div className="run">
        <h1>{run.matcher} / {run.mission.name}</h1>
        <Row>
            <Spacer />
                <IconButton icon="cancel" onClick={cancel} text='Cancel' />
                <Spacer />
                <IconButton icon="arrow_back" disabled={(result.step - undoCount) === 0} onClick={undo} text='Previous' />
                <IconButton icon="arrow_forward" disabled={result.result && undoCount === 0} onClick={redo} text={undoCount === 0 ? 'Advance' : 'Redo'} />
                <Spacer />
                <IconButton icon="pause" disabled={!running} onClick={pause} text="Pause" />
                <IconButton icon="play_arrow" disabled={running || !!result.result} onClick={play} text='Play' />
            <Spacer />
        </Row>
        <Row>
            <Spacer />
            <h2>Step: {currentStep}</h2>
            <Spacer />
            <h2>{currentState?.step ?? ""}</h2>
            <Spacer />
            {result?.result && <h2>Score: {getScore(result?.result)}</h2>}
            <Spacer />
        </Row>
        <h3>{currentState?.message ?? ""}</h3>
        {currentState && <VisualizeUI state={currentState} />}
    </div>;
}

function App() {
    const [run, setRun] = useState<MatchRun>();

    function startRun(matcher: MatcherName, mission: Mission) {
        setRun({
            matcher,
            mission
        });
    }

    if (run) return <RunUI run={run} exit={() => setRun(undefined)} />;

    return <div className="app">
        <Start startRun={startRun} />
    </div>;
}

export default App;
