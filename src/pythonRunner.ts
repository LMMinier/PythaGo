import type { GameAction } from './lessons';

export type RunResult = {
  success: boolean;
  output: string;
  error: string;
  errorLine?: number;
  actions: GameAction[];
  durationMs: number;
};

type WorkerRequest =
  | { id: number; type: 'init'; pyodideUrl: string }
  | { id: number; type: 'run'; source: string; testCode: string; pyodideUrl: string };
type WorkerResponse = Partial<RunResult> & { id: number; ready?: boolean; error?: string };

const RUN_TIMEOUT_MS = 5_000;

const WORKER_SOURCE = String.raw`
let pyodidePromise;
const helpers = "_actions = []\ndef say(message):\n    _actions.append({\"type\": \"say\", \"message\": str(message)})\ndef activate(target=\"beacon\"):\n    _actions.append({\"type\": \"activate\", \"target\": str(target)})\ndef recharge(amount=1):\n    _actions.append({\"type\": \"recharge\", \"amount\": int(amount)})\ndef unlock(gate=\"north\"):\n    _actions.append({\"type\": \"unlock\", \"gate\": str(gate)})\n";
function loadRuntime(pyodideUrl) {
  if (!pyodidePromise) {
    importScripts(pyodideUrl + 'pyodide.js');
    pyodidePromise = loadPyodide({ indexURL: pyodideUrl });
  }
  return pyodidePromise;
}
function lineNumber(error) {
  const match = String(error && error.message || error).match(/File "<exec>", line (\d+)/);
  return match ? Number(match[1]) : undefined;
}
async function readState(pyodide) {
  let output = '';
  let actions = [];
  try { output = pyodide.runPython('_stdout.getvalue() if "_stdout" in globals() else ""'); } catch (_) {}
  try { actions = JSON.parse(pyodide.runPython('import json\njson.dumps(_actions if "_actions" in globals() else [])')); } catch (_) {}
  return { output, actions };
}
self.onmessage = async (event) => {
  const message = event.data;
  if (message.type === 'init') {
    try {
      await loadRuntime(message.pyodideUrl);
      self.postMessage({ id: message.id, ready: true });
    } catch (error) {
      self.postMessage({ id: message.id, ready: false, error: String(error && error.message || error) });
    }
    return;
  }

  const started = performance.now();
  try {
    const pyodide = await loadRuntime(message.pyodideUrl);
    pyodide.runPython('import sys, io\n_stdout = io.StringIO()\nsys.stdout = _stdout\nsys.stderr = _stdout\n_output = ""');
    pyodide.runPython(helpers, { filename: '<helpers>' });
    pyodide.runPython(message.source, { filename: '<exec>' });
    pyodide.runPython('_output = _stdout.getvalue()');
    pyodide.runPython(message.testCode, { filename: '<tests>' });
    const state = await readState(pyodide);
    self.postMessage({ id: message.id, success: true, output: state.output, error: '', actions: state.actions, durationMs: Math.round(performance.now() - started) });
  } catch (error) {
    const pyodide = await loadRuntime(message.pyodideUrl);
    const state = await readState(pyodide);
    self.postMessage({ id: message.id, success: false, output: state.output, error: String(error && error.message || error), errorLine: lineNumber(error), actions: state.actions, durationMs: Math.round(performance.now() - started) });
  }
};
`;
export class PythonRunner {
  private worker?: Worker;
  private workerUrl?: string;
  private sequence = 0;
  private pending = new Map<number, (value: RunResult) => void>();
  private readyPromise: Promise<void> = Promise.resolve();

  constructor(private readonly pyodideUrl: string) {
    this.reset();
  }

  ready() {
    return this.readyPromise;
  }

  run(source: string, testCode: string) {
    const id = ++this.sequence;
    return new Promise<RunResult>((resolve) => {
      const timeout = window.setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        this.stop();
        resolve({ success: false, output: '', error: 'Python timed out and the worker was reset.', actions: [], durationMs: RUN_TIMEOUT_MS });
      }, RUN_TIMEOUT_MS);
      this.pending.set(id, (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      });
      this.worker?.postMessage({ id, type: 'run', source, testCode, pyodideUrl: this.pyodideUrl } satisfies WorkerRequest);
    });
  }

  stop() {
    for (const resolve of this.pending.values()) {
      resolve({ success: false, output: '', error: 'Python worker was reset.', actions: [], durationMs: 0 });
    }
    this.pending.clear();
    this.reset();
  }

  destroy() {
    this.worker?.terminate();
    if (this.workerUrl) URL.revokeObjectURL(this.workerUrl);
    this.worker = undefined;
    this.workerUrl = undefined;
  }

  private reset() {
    this.worker?.terminate();
    if (this.workerUrl) URL.revokeObjectURL(this.workerUrl);
    const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
    this.workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerUrl);
    this.worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.ready !== undefined) return;
      const resolve = this.pending.get(data.id);
      if (resolve) {
        this.pending.delete(data.id);
        resolve({
          success: Boolean(data.success),
          output: data.output ?? '',
          error: data.error ?? '',
          errorLine: data.errorLine,
          actions: data.actions ?? [],
          durationMs: data.durationMs ?? 0,
        });
      }
    };
    this.readyPromise = new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const onMessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (data.id !== id || data.ready === undefined) return;
        this.worker?.removeEventListener('message', onMessage);
        if (data.ready) resolve();
        else reject(new Error(data.error || 'Pyodide failed to load.'));
      };
      this.worker?.addEventListener('message', onMessage);
      this.worker?.postMessage({ id, type: 'init', pyodideUrl: this.pyodideUrl } satisfies WorkerRequest);
    });
  }
}
