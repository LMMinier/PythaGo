'use dom';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createGame, type GameController } from './gameScene';
import { DEFAULT_PROGRESS, MISSIONS, type Progress } from './lessons';
import { PythonRunner, type RunResult } from './pythonRunner';
import './styles.css';

type Props = {
  dom?: import('expo/dom').DOMProps;
  loadProgress: () => Promise<Progress | null>;
  saveProgress: (value: Progress) => Promise<void>;
};

type Runtime = 'loading' | 'ready' | 'error';

export default function GameDom({ loadProgress, saveProgress }: Props) {
  const base = useMemo(() => new URL(process.env.EXPO_BASE_URL ?? '/', location.href).href, []);
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [missionIndex, setMissionIndex] = useState(0);
  const [source, setSource] = useState(MISSIONS[0].starterCode);
  const [runtime, setRuntime] = useState<Runtime>('loading');
  const [result, setResult] = useState<RunResult>();
  const [running, setRunning] = useState(false);
  const [hint, setHint] = useState(false);
  const [victory, setVictory] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameController | undefined>(undefined);
  const runnerRef = useRef<PythonRunner | undefined>(undefined);
  const mission = MISSIONS[missionIndex];
  const unlocked = Math.min(MISSIONS.length - 1, Math.max(progress.currentMission, progress.completed.length));

  useEffect(() => {
    loadProgress().then((saved) => {
      const next = saved ? { ...DEFAULT_PROGRESS, ...saved } : DEFAULT_PROGRESS;
      const index = Math.min(MISSIONS.length - 1, next.currentMission);
      setProgress(next);
      setMissionIndex(index);
      setSource(MISSIONS[index].starterCode);
    }).finally(() => setLoaded(true));
  }, [loadProgress]);

  useEffect(() => {
    const runner = new PythonRunner('https://cdn.jsdelivr.net/pyodide/v314.0.1/full/');
    runnerRef.current = runner;
    runner.ready().then(() => setRuntime('ready')).catch(() => setRuntime('error'));
    return () => runner.destroy();
  }, []);

  useEffect(() => {
    if (!started || !mountRef.current || gameRef.current) return;
    gameRef.current = createGame(mountRef.current, base);
    return () => {
      gameRef.current?.destroy();
      gameRef.current = undefined;
    };
  }, [started, base]);

  useEffect(() => {
    if (loaded) saveProgress(progress).catch(() => undefined);
  }, [loaded, progress, saveProgress]);

  function chooseMission(index: number) {
    if (index > unlocked) return;
    setMissionIndex(index);
    setSource(MISSIONS[index].starterCode);
    setResult(undefined);
    setHint(false);
  }

  async function execute() {
    if (!runnerRef.current || runtime !== 'ready' || running) return;
    setRunning(true);
    setResult(undefined);
    try {
      const nextResult = await runnerRef.current.run(source, mission.testCode);
      setResult(nextResult);
      gameRef.current?.actions(nextResult.actions);
      if (nextResult.success) {
        const alreadyDone = progress.completed.includes(mission.id);
        setProgress({
          currentMission: Math.min(MISSIONS.length - 1, Math.max(progress.currentMission, missionIndex + 1)),
          completed: alreadyDone ? progress.completed : [...progress.completed, mission.id],
          xp: alreadyDone ? progress.xp : progress.xp + mission.xp,
        });
        gameRef.current?.celebrate();
        setTimeout(() => setVictory(true), 350);
      }
    } catch (error) {
      setResult({ success: false, output: '', error: error instanceof Error ? error.message : 'Runtime failed.', actions: [], durationMs: 0 });
    } finally {
      setRunning(false);
    }
  }

  function stop() {
    runnerRef.current?.stop();
    setRuntime('loading');
    runnerRef.current?.ready().then(() => setRuntime('ready')).catch(() => setRuntime('error'));
  }

  function advance() {
    setVictory(false);
    if (missionIndex < MISSIONS.length - 1) chooseMission(missionIndex + 1);
  }

  const consoleText = result
    ? [result.output.trim(), result.error].filter(Boolean).join('\n') || 'Program finished.'
    : 'Run the program to see output and mission checks.';

  if (!loaded) return <main className="loading">Loading Code Borough…</main>;

  if (!started) {
    return (
      <main className="start" style={{ backgroundImage: `url(${base}game/title-screen.svg)` }}>
        <section>
          <img src={`${base}game/logo.svg`} alt="PythaGo: Code Borough" />
          <p>Learn real Python, restore a living city, and watch every successful program change the world.</p>
          <button onClick={() => setStarted(true)}>ENTER CODE BOROUGH</button>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="hud">
        <strong>PythaGo</strong>
        <span>{mission.district}</span>
        <b>{progress.xp} XP</b>
        <b>{progress.completed.length}/{MISSIONS.length}</b>
      </header>

      <section className="world">
        <div ref={mountRef} />
        <span className={`runtime ${runtime}`}>{runtime === 'ready' ? 'PYTHON READY' : runtime === 'loading' ? 'LOADING PYTHON' : 'RUNTIME ERROR'}</span>
        <nav className="move">
          <button onPointerDown={() => gameRef.current?.move('up')}>▲</button>
          <button onPointerDown={() => gameRef.current?.move('left')}>◀</button>
          <button onPointerDown={() => gameRef.current?.move('down')}>▼</button>
          <button onPointerDown={() => gameRef.current?.move('right')}>▶</button>
        </nav>
      </section>

      <nav className="missions">
        {MISSIONS.map((item, index) => (
          <button
            key={item.id}
            disabled={index > unlocked}
            className={index === missionIndex ? 'selected' : progress.completed.includes(item.id) ? 'done' : ''}
            onClick={() => chooseMission(index)}
          >
            {progress.completed.includes(item.id) ? '✓ ' : ''}{index + 1}. {item.concept}
          </button>
        ))}
      </nav>

      <section className="workspace">
        <article className="briefing">
          <small>MISSION {missionIndex + 1}</small>
          <h1>{mission.title}</h1>
          <code>{mission.concept}</code>
          <p>{mission.briefing}</p>
          <div><b>Objective:</b> {mission.objective}</div>
          <button onClick={() => setHint(!hint)}>{hint ? 'Hide hint' : 'Need a hint?'}</button>
          {hint && <em>{mission.hint}</em>}
        </article>

        <article className="editor">
          <header><span>mission_{missionIndex + 1}.py</span><button onClick={() => setSource(mission.starterCode)}>RESET</button></header>
          <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} autoCapitalize="off" autoCorrect="off" />
          <pre className={result?.success ? 'pass' : result ? 'fail' : ''}>{consoleText}{result?.errorLine ? `\nLine ${result.errorLine}` : ''}</pre>
          <footer>
            <button disabled={runtime !== 'ready' || running} onClick={execute}>{running ? 'RUNNING…' : '▶ RUN PYTHON'}</button>
            <button onClick={stop}>■ STOP</button>
          </footer>
        </article>
      </section>

      {victory && (
        <aside className="victory">
          <section>
            <span>✓</span>
            <h2>{mission.title} complete</h2>
            <p>Your code passed the mission checks and changed Code Borough.</p>
            <b>+{mission.xp} XP</b>
            <button onClick={advance}>{missionIndex < MISSIONS.length - 1 ? 'NEXT MISSION' : 'DISTRICT RESTORED'}</button>
          </section>
        </aside>
      )}
    </main>
  );
}
