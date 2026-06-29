import type { GameAction } from './lessons';

export interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  errorLine?: number;
  actions: GameAction[];
  durationMs: number;
}

const WORKER = String.raw`
let pyodide;
const EXECUTOR = String.raw\`
import ast, contextlib, io, json, time, traceback
source, tests = __source__, __tests__
started = time.perf_counter()
stdout, actions = io.StringIO(), []

def text(v, n=180): return str(v)[:n]
def activate(target): actions.append({"type":"activate","target":text(target)})
def recharge(target): actions.append({"type":"recharge","target":text(target)})
def say(speaker, message): actions.append({"type":"say","speaker":text(speaker,60),"text":text(message,240)})
def unlock(target): actions.append({"type":"unlock","target":text(target)})

ns={"__name__":"__player__","activate":activate,"recharge":recharge,"say":say,"unlock":unlock}
success=False; error=None; error_line=None
try:
    tree=ast.parse(source, filename="<player>", mode="exec")
    blocked={"eval","exec","open","compile","__import__","globals","locals","vars","breakpoint"}
    for node in ast.walk(tree):
        if isinstance(node,(ast.Import,ast.ImportFrom)): raise PermissionError("Imports are locked in Workshop missions.")
        if isinstance(node,ast.Name) and node.id in blocked: raise PermissionError(f"{node.id}() is unavailable in this sandbox.")
        if isinstance(node,ast.Attribute) and node.attr.startswith("__"): raise PermissionError("Private runtime attributes are unavailable.")
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stdout):
        exec(compile(tree,"<player>","exec"),ns,ns)
        ns["__output__"], ns["__actions__"] = stdout.getvalue(), actions
        exec(compile(tests,"<mission-tests>","exec"),ns,ns)
    success=True
except BaseException as exc:
    error=f"{type(exc).__name__}: {exc}"
    if isinstance(exc,SyntaxError): error_line=exc.lineno
    else:
        frames=[f for f in traceback.extract_tb(exc.__traceback__) if f.filename=="<player>"]
        if frames: error_line=frames[-1].lineno
json.dumps({"success":success,"output":stdout.getvalue()[:12000],"error":error,"errorLine":error_line,"actions":actions[:200],"durationMs":round((time.perf_counter()-started)*1000,2)})
\`;
self.onmessage = async ({data}) => {
  if (data.type === 'init') {
    try {
      importScripts(data.base + 'pyodide.js');
      pyodide = await loadPyodide({ indexURL: data.base });
      postMessage({type:'ready'});
    } catch (e) { postMessage({type:'fatal', error:String(e?.message || e)}); }
  }
  if (data.type === 'run') {
    try {
      pyodide.globals.set('__source__', data.source);
      pyodide.globals.set('__tests__', data.tests);
      const raw = await pyodide.runPythonAsync(EXECUTOR);
      postMessage({type:'result', result:JSON.parse(raw)});
    } catch (e) {
      postMessage({type:'result', result:{success:false,output:'',error:String(e?.message||e),actions:[],durationMs:0}});
    } finally {
      try { pyodide.globals.delete('__source__'); pyodide.globals.delete('__tests__'); } catch (_) {}
    }
  }
};
`;

export class PythonRunner {
  private worker!: Worker;
  private readyPromise!: Promise<void>;
  private readyResolve?: () => void;
  private readyReject?: (error: Error) => void;
  private pending?: { resolve: (r: RunResult) => void; timeout: ReturnType<typeof setTimeout> };

  constructor(private base: string) { this.spawn(); }

  private spawn() {
    this.worker?.terminate();
    const url=URL.createObjectURL(new Blob([WORKER],{type:'application/javascript'}));
    this.worker=new Worker(url); URL.revokeObjectURL(url);
    this.readyPromise=new Promise((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;});
    this.worker.onmessage=({data})=>{
      if(data.type==='ready') this.readyResolve?.();
      if(data.type==='fatal') this.readyReject?.(new Error(data.error));
      if(data.type==='result' && this.pending){clearTimeout(this.pending.timeout);this.pending.resolve(data.result);this.pending=undefined;}
    };
    this.worker.onerror=(e)=>this.readyReject?.(new Error(e.message));
    this.worker.postMessage({type:'init',base:this.base});
  }

  ready(){return this.readyPromise;}

  async run(source:string,tests:string,limit=4500):Promise<RunResult>{
    await this.readyPromise;
    if(this.pending) throw new Error('A program is already running.');
    return new Promise(resolve=>{
      const timeout=setTimeout(()=>{
        this.pending=undefined; this.spawn();
        resolve({success:false,output:'',error:'Execution stopped: time limit exceeded. Check for an infinite loop.',actions:[],durationMs:limit});
      },limit);
      this.pending={resolve,timeout};
      this.worker.postMessage({type:'run',source,tests});
    });
  }

  stop(){
    if(this.pending){clearTimeout(this.pending.timeout);this.pending.resolve({success:false,output:'',error:'Execution stopped by player.',actions:[],durationMs:0});this.pending=undefined;}
    this.spawn();
  }
  destroy(){this.worker?.terminate();}
}
