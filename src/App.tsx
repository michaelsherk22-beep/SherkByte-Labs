import React, { useMemo, useRef, useState } from "react";

/**
 * IT Troubleshooting Trainer – single‑file React app
 * -------------------------------------------------
 * What you get:
 *  - A clean landing page with searchable problem library
 *  - Guided Troubleshooter (decision-tree) for common issues
 *  - Hands‑on Labs (interactive, graded) with a fake terminal
 *  - Quizzes & progress tracking in localStorage
 *  - Modular data: add new flows/labs by editing the FLOW_DEFS and LAB_DEFS
 *
 * Styling: TailwindCSS utility classes
 * Icons: simple inline SVGs
 */

/*************************
 * Utility & Dummy Icons
 *************************/
const Icon = {
  Search: (props:any) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Play: (p:any) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...p}><path d="M8 5v14l11-7z"/></svg>
  ),
  Lab: (p:any) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3"/>
    </svg>
  ),
  ArrowRight: (p:any) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7"/></svg>
  ),
  Check: (p:any)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M20 6L9 17l-5-5"/></svg>),
  Terminal: (p:any)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 17l6-6-6-6"/><path d="M12 19h8"/></svg>),
  Book: (p:any)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M20 22H6.5A2.5 2.5 0 0 1 4 19.5V5A2 2 0 0 1 6 3h14z"/></svg>),
};

/*************************
 * Data: Troubleshooter Flows
 *************************/
// Each node has: id, title, prompt, options: [{label, next, correct?}] and optional tip
// Mark one path with correct:true to enable scoring/badging
const FLOW_DEFS = {
  "Wifi Drops on Windows": {
    id: "wifi-win",
    category: "Networking",
    description: "Intermittent Wi‑Fi on Windows 10/11.",
    nodes: {
      start: {
        id: "start",
        title: "Confirm the basics",
        prompt: "Are other devices on the same network dropping too?",
        options: [
          { label: "Yes, multiple devices affected", next: "router" },
          { label: "No, only this Windows PC", next: "pc-only" },
        ],
        tip: "Always differentiate local vs. global symptoms first.",
      },
      router: {
        id: "router",
        title: "Suspect the router/AP",
        prompt: "Power‑cycle the router/AP and check for firmware updates. Did stability improve?",
        options: [
          { label: "Yes – issue resolved", next: "resolved", correct: true },
          { label: "No – still dropping", next: "channel" },
        ],
        tip: "Firmware and DFS channels can cause odd drops.",
      },
      channel: {
        id: "channel",
        title: "Check channel & band",
        prompt: "Try 5 GHz only and pick a clean channel (36/40/44/48). Improve?",
        options: [
          { label: "Yes – stable now", next: "resolved", correct: true },
          { label: "No – still dropping", next: "pc-only" },
        ],
      },
      "pc-only": {
        id: "pc-only",
        title: "Focus on the PC",
        prompt: "Update NIC driver from vendor site (not Windows Update) and disable power saving on the adapter. Any change?",
        options: [
          { label: "Fixed it", next: "resolved", correct: true },
          { label: "Still broken", next: "reset" },
        ],
      },
      reset: {
        id: "reset",
        title: "Network reset",
        prompt: "Run: netsh winsock reset && netsh int ip reset && restart. Improve?",
        options: [
          { label: "Yes", next: "resolved", correct: true },
          { label: "No", next: "final" },
        ],
      },
      final: {
        id: "final",
        title: "Deeper causes",
        prompt: "Consider USB 3 interference (if using USB Wi‑Fi), bad antenna, or security software. Try Ethernet to isolate RF.",
        options: [ { label: "Back to start", next: "start" } ],
      },
      resolved: {
        id: "resolved",
        title: "Resolved",
        prompt: "Great! Document what fixed it and why.",
        options: [ { label: "Restart flow", next: "start" } ],
      },
    },
    start: "start",
  },
  "Linux Disk Filling Up": {
    id: "linux-disk",
    category: "Linux",
    description: "Find what’s using space and fix safely.",
    nodes: {
      start: {
        id: "start",
        title: "Check usage",
        prompt: "What's your first move?",
        options: [
          { label: "Run df -h to see mounted FS", next: "df", correct: true },
          { label: "Delete /var/log blindly", next: "oops" },
        ],
      },
      df: {
        id: "df",
        title: "Spot the culprit",
        prompt: "Use du -hx --max-depth=1 / | sort -h. What next?",
        options: [
          { label: "Drill into the largest dir", next: "drill", correct: true },
          { label: "rm -rf /* to free space", next: "oops" },
        ],
      },
      drill: {
        id: "drill",
        title: "Rotating logs",
        prompt: "Logs huge? Configure logrotate and compress old logs.",
        options: [
          { label: "Rotate & compress", next: "resolved", correct: true },
          { label: "Ignore and hope", next: "oops" },
        ],
      },
      oops: {
        id: "oops",
        title: "Risky path",
        prompt: "That action is dangerous and not recommended.",
        options: [ { label: "Go back", next: "start" } ],
      },
      resolved: {
        id: "resolved",
        title: "Resolved",
        prompt: "Nice work. Document root cause & prevention.",
        options: [ { label: "Restart", next: "start" } ],
      },
    },
    start: "start",
  },
};

/*************************
 * Data: Hands‑on Labs
 *************************/
// Each lab has: id, title, objectives, tasks, evaluator(cmd, output predicate), hints
const LAB_DEFS = [
  {
    id: "net-basics",
    title: "Network Basics Lab",
    difficulty: "Beginner",
    objectives: [
      "Use ping and tracert/tracepath to test connectivity",
      "Differentiate DNS vs network failures",
      "Capture basic findings"
    ],
    startingTips: "Try 'ping chat.openai.com' or 'ping 1.1.1.1'. Use 'nslookup domain' to test DNS.",
    tasks: [
      { id: "t1", text: "Ping a public IP (e.g., 1.1.1.1)" },
      { id: "t2", text: "Ping a domain (e.g., example.com)" },
      { id: "t3", text: "Run a traceroute/tracepath to example.com" },
    ],
    evaluator: (history:string[]) => {
      const hasPingIP = history.some(h=>/^ping\s+(1\.1\.1\.1|8\.8\.8\.8)/i.test(h));
      const hasPingDomain = history.some(h=>/^ping\s+([a-z0-9.-]+\.[a-z]{2,})/i.test(h));
      const hasTrace = history.some(h=>/^(traceroute|tracert|tracepath)\s+/i.test(h));
      return { passed: hasPingIP && hasPingDomain && hasTrace, score: [hasPingIP, hasPingDomain, hasTrace].filter(Boolean).length };
    },
    hints: ["Remember: DNS resolves names to IPs.", "If a domain ping fails but IP works, suspect DNS."]
  },
  {
    id: "linux-perms",
    title: "Linux Permissions Lab",
    difficulty: "Intermediate",
    objectives: [
      "List permissions with ls -l",
      "Change permissions with chmod",
      "Use chown to change ownership"
    ],
    startingTips: "Practice basic commands: ls -l, chmod 644 file, chown user:group file.",
    tasks: [
      { id: "t1", text: "Run ls -l" },
      { id: "t2", text: "Change a file's mode using chmod" },
      { id: "t3", text: "Use chown to set an owner" },
    ],
    evaluator: (history:string[]) => {
      const ls = history.some(h=>/^ls\s+-l(\s+|$)/.test(h));
      const chmod = history.some(h=>/^chmod\s+\d{3}\b/.test(h));
      const chown = history.some(h=>/^chown\s+\w+(:\w+)?\s+\S+/.test(h));
      return { passed: ls && chmod && chown, score: [ls, chmod, chown].filter(Boolean).length };
    },
    hints: ["chmod 644 my.txt", "chown alice:dev my.txt"]
  },
  {
    id: "win-startup",
    title: "Windows Startup Issues (Guided)",
    difficulty: "Beginner",
    objectives: ["Practice safe‑mode logic", "Identify driver vs update causes"],
    startingTips: "Simulate decisions – no terminal needed.",
    tasks: [],
    evaluator: () => ({ passed: true, score: 3 }),
    hints: [],
  }
];

/*************************
 * Local Storage Helpers
 *************************/
const store = {
  get(key:string, fallback:any){
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
  },
  set(key:string, value:any){ localStorage.setItem(key, JSON.stringify(value)); },
};

/*************************
 * Fake Terminal Component
 *************************/
const FakeTerminal: React.FC<{
  onCommand:(cmd:string)=>void,
  prompt?: string,
  banner?: string,
}> = ({ onCommand, prompt = "student@lab:~$", banner }) => {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<string[]>(banner ? [banner] : []);
  const boxRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e:any) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setLines(l => [...l, `${prompt} ${cmd}`, simulateOutput(cmd)]);
    onCommand(cmd);
    setInput("");
    setTimeout(()=>{ boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }); }, 0);
  };

  function simulateOutput(cmd:string){
    // Extremely simplified simulation for learning by pattern recognition.
    if (/^ping\s+1\.1\.1\.1/.test(cmd)) return "64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=12.3 ms";
    if (/^ping\s+8\.8\.8\.8/.test(cmd)) return "64 bytes from 8.8.8.8: icmp_seq=1 ttl=55 time=18.1 ms";
    if (/^ping\s+([a-z0-9.-]+\.[a-z]{2,})/i.test(cmd)) return "PING domain: Name resolved, replies received";
    if (/^(traceroute|tracert|tracepath)\s+/i.test(cmd)) return "Tracing route... hop 1 (192.168.1.1) -> hop 2 (ISP) -> hop 8 (dest)";
    if (/^nslookup\s+/i.test(cmd)) return "Server: 1.1.1.1\nAddress: 1.1.1.1#53\nName: example.com\nAddress: 93.184.216.34";
    if (/^ls\s+-l/.test(cmd)) return "-rw-r--r-- 1 alice dev  12 Sep 11 10:00 notes.txt\n-rw-r----- 1 root  root 55 Sep 11 10:02 system.log";
    if (/^chmod\s+\d{3}\b/.test(cmd)) return "(ok) permissions changed";
    if (/^chown\s+/.test(cmd)) return "(ok) ownership updated";
    if (/^help$/.test(cmd)) return "Try ping, traceroute/tracert, nslookup, ls -l, chmod, chown";
    return "Command simulated. Type 'help' for ideas.";
  }

  return (
    <div className="bg-black text-green-200 font-mono rounded-xl p-3 shadow-inner border border-zinc-800">
      <div ref={boxRef} className="h-56 overflow-auto pr-2">
        {lines.map((l, i)=>(
          <pre key={i} className="whitespace-pre-wrap text-sm leading-6">{l}</pre>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
        <span className="text-xs text-zinc-400">{prompt}</span>
        <input
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-green-100 placeholder:text-zinc-600"
          placeholder="type a command, e.g., ping 1.1.1.1"
        />
        <button className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">Run</button>
      </form>
    </div>
  );
};

/*************************
 * Troubleshooter Component
 *************************/
const Troubleshooter: React.FC<{ flowKey: keyof typeof FLOW_DEFS }>=({ flowKey })=>{
  const [nodeId, setNodeId] = useState(FLOW_DEFS[flowKey].start);
  const [score, setScore] = useState(0);
  const flow = FLOW_DEFS[flowKey];
  const node: any = flow.nodes[nodeId as keyof typeof flow.nodes];

  function choose(opt:any){
    if (opt.correct) setScore(s=>s+1);
    setNodeId(opt.next);
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-500">Path score: <span className="font-semibold text-zinc-200">{score}</span></div>
      <div className="rounded-2xl border border-zinc-200/10 bg-zinc-900 p-4">
        <h3 className="text-lg font-semibold mb-1">{node.title}</h3>
        <p className="text-zinc-300 mb-3">{node.prompt}</p>
        <div className="flex flex-col gap-2">
          {node.options.map((o:any, i:number)=> (
            <button key={i} onClick={()=>choose(o)} className="px-3 py-2 rounded-xl border border-zinc-700 text-left hover:bg-zinc-800 flex items-center justify-between">
              <span>{o.label}</span>
              <Icon.ArrowRight className="opacity-70"/>
            </button>
          ))}
        </div>
        {node.tip && <p className="text-xs text-zinc-500 mt-3">Tip: {node.tip}</p>}
      </div>
    </div>
  );
};

/*************************
 * Lab Runner Component
 *************************/
const LabRunner: React.FC<{ labId: string }>=({ labId })=>{
  const lab = useMemo(()=> LAB_DEFS.find(l=>l.id===labId)!, [labId]);
  const [history, setHistory] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<{passed:boolean; score:number}|null>(null);

  const onCommand = (cmd:string)=> setHistory(h=>[...h, cmd]);
  const evaluate = () => {
    const r = lab.evaluator(history);
    setResult(r);
    setCompleted(true);
    const key = `lab:${lab.id}:badges`;
    store.set(key, { completedAt: new Date().toISOString(), score: r.score });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/10 bg-zinc-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">{lab.title}</h3>
            <p className="text-sm text-zinc-400">Difficulty: {lab.difficulty}</p>
          </div>
          <button onClick={evaluate} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2">
            <Icon.Check/> Evaluate
          </button>
        </div>
        {lab.objectives?.length>0 && (
          <div className="mt-3">
            <h4 className="font-medium mb-1 text-zinc-200">Objectives</h4>
            <ul className="list-disc ml-6 text-sm text-zinc-300">
              {lab.objectives.map((o,i)=>(<li key={i}>{o}</li>))}
            </ul>
          </div>
        )}
        {lab.startingTips && <p className="text-xs text-zinc-500 mt-2">Hint: {lab.startingTips}</p>}
      </div>

      {lab.id !== 'win-startup' ? (
        <FakeTerminal onCommand={onCommand} banner={"Welcome to the simulated lab terminal. Type 'help' to see sample commands."} />
      ) : (
        <div className="rounded-2xl border border-zinc-200/10 bg-zinc-900 p-4 text-sm text-zinc-300">
          <p>Use the Troubleshooter card on the right to walk the Windows startup flow. This lab auto‑passes when you click Evaluate.</p>
        </div>
      )}

      {completed && result && (
        <div className={`rounded-xl p-4 border ${result.passed? 'border-emerald-700 bg-emerald-900/30':'border-rose-700 bg-rose-900/30'}`}>
          <div className="flex items-center gap-2 font-medium">
            <Icon.Check/>
            {result.passed ? 'Lab Passed':'Lab Incomplete'} – Score: {result.score}
          </div>
          <p className="text-xs text-zinc-300 mt-1">Your completion badge has been stored locally. Replace with a backend later.</p>
        </div>
      )}

      <div>
        <h4 className="font-medium text-zinc-200 mb-1">Task Checklist</h4>
        <ul className="text-sm text-zinc-300 list-disc ml-6">
          {lab.tasks.map(t=>
            <li key={t.id} className={history.some(h=>h.toLowerCase().includes(t.text.split(" ")[0].toLowerCase())) ? 'line-through opacity-60' : ''}>{t.text}</li>
          )}
        </ul>
      </div>

      {lab.hints?.length>0 && (
        <details className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-zinc-300">
          <summary className="cursor-pointer font-medium">Need a nudge?</summary>
          <ul className="list-disc ml-6 mt-2">{lab.hints.map((h,i)=>(<li key={i}>{h}</li>))}</ul>
        </details>
      )}
    </div>
  );
};

/*************************
 * Progress Badges Component
 *************************/
const Badges: React.FC = () => {
  const [items] = useState(() => ( LAB_DEFS.map(l => ({ id: l.id, title: l.title, badge: store.get(`lab:${l.id}:badges`, null) })) ));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(it=> (
        <div key={it.id} className="rounded-xl border border-zinc-800 p-3 bg-zinc-900 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-200">{it.title}</div>
            <div className="text-xs text-zinc-400">{it.badge ? `Completed: ${new Date(it.badge.completedAt).toLocaleString()}` : 'Not completed yet'}</div>
          </div>
          <div className={`px-3 py-1 rounded-lg text-xs ${it.badge ? 'bg-emerald-800/40 text-emerald-200' : 'bg-zinc-800 text-zinc-300'}`}>{it.badge ? `Score ${it.badge.score}` : 'Locked'}</div>
        </div>
      ))}
    </div>
  );
};

/*************************
 * Problem Library & Search
 *************************/
const PROBLEMS = Object.entries(FLOW_DEFS).map(([title, meta]:any)=> ({
  id: meta.id,
  title,
  category: meta.category,
  description: meta.description,
}));

const Library: React.FC<{ onPick:(flowKey:any)=>void, onStartLab:(id:string)=>void }>=({ onPick, onStartLab })=>{
  const [q, setQ] = useState("");
  const filtered = PROBLEMS.filter(p=> (p.title+p.category+p.description).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2 rounded-xl border border-zinc-800 bg-zinc-900">
        <Icon.Search/>
        <input value={q} onChange={(e)=>setQ(e.target.value)} className="bg-transparent outline-none flex-1 text-sm" placeholder="Search issues, e.g., Wi‑Fi, Linux, Windows..."/>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map(p=> (
          <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-400">{p.category}</div>
            <div className="font-semibold mt-1 text-zinc-100">{p.title}</div>
            <p className="text-sm text-zinc-400 mt-1">{p.description}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={()=>onPick(p.title)} className="px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center gap-2 text-sm hover:bg-zinc-700">
                <Icon.Book/> Troubleshoot
              </button>
              <button onClick={()=>onStartLab('net-basics')} className="px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center gap-2 text-sm hover:bg-zinc-700">
                <Icon.Lab/> Try a Lab
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/*************************
 * Main App
 *************************/
export default function App(){
  const [view, setView] = useState<'home'|'troubleshoot'|'labs'|'badges'>('home');
  const [activeFlow, setActiveFlow] = useState<keyof typeof FLOW_DEFS>('Wifi Drops on Windows');
  const [activeLabId, setActiveLabId] = useState<string>('net-basics');

  const startTroubleshooter = (flowKey:any)=>{
    setActiveFlow(flowKey);
    setView('troubleshoot');
  };
  const startLab = (id:string)=>{ setActiveLabId(id); setView('labs'); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100">
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SherkByte" className="h-9 w-9 rounded-2xl object-contain border border-zinc-800 bg-white/5 p-1" />
          <div>
            <div className="font-semibold">IT Troubleshooting Trainer</div>
            <div className="text-xs text-zinc-400">Hands‑on labs & guided flows</div>
          </div>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <button onClick={()=>setView('home')} className={`px-3 py-1.5 rounded-xl hover:bg-zinc-900 ${view==='home'?'bg-zinc-900 border border-zinc-800':''}`}>Library</button>
          <button onClick={()=>setView('labs')} className={`px-3 py-1.5 rounded-xl hover:bg-zinc-900 ${view==='labs'?'bg-zinc-900 border border-zinc-800':''}`}>Labs</button>
          <button onClick={()=>setView('troubleshoot')} className={`px-3 py-1.5 rounded-xl hover:bg-zinc-900 ${view==='troubleshoot'?'bg-zinc-900 border border-zinc-800':''}`}>Troubleshooter</button>
          <button onClick={()=>setView('badges')} className={`px-3 py-1.5 rounded-xl hover:bg-zinc-900 ${view==='badges'?'bg-zinc-900 border border-zinc-800':''}`}>Badges</button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-20">
        {/* Hero */}
        {view==='home' && (
          <section className="mb-8">
            <div className="rounded-3xl border border-zinc-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-900 to-zinc-950 p-6">
              <div className="grid lg:grid-cols-5 gap-6 items-center">
                <div className="lg:col-span-3">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Learn by doing: fix real‑world IT issues in a safe sandbox</h1>
                  <p className="text-zinc-300 mt-2">Pick a problem, follow a logical flow, and practice commands in an instant terminal. Earn badges as you master each scenario.</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={()=>setView('labs')} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"><Icon.Play/> Start a Lab</button>
                    <button onClick={()=>setView('troubleshoot')} className="px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-700">Open Troubleshooter</button>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-300 mb-2"><Icon.Terminal/> Live Terminal</div>
                    <FakeTerminal onCommand={()=>{}} banner={"$ This is a preview. Switch to Labs to interact."} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Views */}
        {view==='home' && (
          <Library onPick={startTroubleshooter} onStartLab={startLab} />
        )}

        {view==='troubleshoot' && (
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs uppercase tracking-wide text-zinc-400">Flow</div>
                <div className="text-lg font-semibold mt-1">{String(activeFlow)}</div>
                <Troubleshooter flowKey={activeFlow} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs uppercase tracking-wide text-zinc-400">Try a related Lab</div>
                <LabRunner labId={activeLabId} />
              </div>
            </div>
          </section>
        )}

        {view==='labs' && (
          <section className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {LAB_DEFS.map(lab => (
                <button key={lab.id} onClick={()=>setActiveLabId(lab.id)} className={`w-full text-left rounded-2xl border p-4 hover:bg-zinc-900 ${activeLabId===lab.id? 'border-emerald-700 bg-emerald-900/10':'border-zinc-800 bg-zinc-900'}`}>
                  <div className="text-xs uppercase tracking-wide text-zinc-400">{lab.difficulty} Lab</div>
                  <div className="font-semibold">{lab.title}</div>
                </button>
              ))}
            </div>
            <div className="lg:col-span-3">
              <LabRunner labId={activeLabId} />
            </div>
          </section>
        )}

        {view==='badges' && (
          <section className="space-y-4">
            <Badges/>
          </section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-zinc-500">
        <div className="flex items-center justify-between">
          <div>© {new Date().getFullYear()} IT Troubleshooting Trainer</div>
          <div>Add your backend later (user auth, real grading, lab images)</div>
        </div>
      </footer>
    </div>
  );
}
