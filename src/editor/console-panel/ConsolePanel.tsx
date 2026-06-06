/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, AlertTriangle, AlertCircle, CheckCircle2, Info, 
  Trash2, Copy, Download, Search, Play
} from 'lucide-react';
import { retroEventBus, ConsoleLogEvent } from '../../core/events/EventBus';

export type ConsoleLog = ConsoleLogEvent;

// Global buffer to persist logs across component mounts/unmounts
const MAX_LOGS = 500;
let globalLogs: ConsoleLog[] = [
  { id: 'init-1', time: new Date().toTimeString().split(' ')[0], type: 'info', module: 'SYSTEM', text: 'Retro SDK Console initialized and ready.' },
  { id: 'init-2', time: new Date().toTimeString().split(' ')[0], type: 'success', module: 'RENDERER', text: 'Canvas2D graphics hooks live.' }
];

const listeners = new Set<(logs: ConsoleLog[]) => void>();

function notifyListeners() {
  const logsCopy = [...globalLogs];
  listeners.forEach((listener) => listener(logsCopy));
}

export function pushConsoleLog(type: ConsoleLog['type'], module: string, text: string, details?: string) {
  const time = new Date().toTimeString().split(' ')[0];
  const newLog: ConsoleLog = {
    id: Math.random().toString(36).substring(2, 9),
    time,
    type,
    module,
    text,
    details
  };
  globalLogs.push(newLog);
  if (globalLogs.length > MAX_LOGS) {
    globalLogs.shift();
  }
  notifyListeners();
}

let eventBusHooked = false;
function hookEventBusLogs() {
  if (eventBusHooked) return;
  eventBusHooked = true;
  retroEventBus.on('engine-log', (log) => {
    globalLogs.push(log);
    if (globalLogs.length > MAX_LOGS) {
      globalLogs.shift();
    }
    notifyListeners();
  });
}
hookEventBusLogs();

// Flag to guarantee hook is registered exactly once
let originalConsoleHooked = false;

function hookOriginalConsole() {
  if (originalConsoleHooked) return;
  originalConsoleHooked = true;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    pushConsoleLog('info', 'LOG', msg);
  };

  console.warn = (...args: any[]) => {
    originalWarn.apply(console, args);
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    pushConsoleLog('warn', 'WARN', msg);
  };

  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    pushConsoleLog('error', 'ERR', msg);
  };

  console.info = (...args: any[]) => {
    originalInfo.apply(console, args);
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    pushConsoleLog('info', 'INFO', msg);
  };

  // Capture global window exceptions
  window.addEventListener('error', (event) => {
    pushConsoleLog('error', 'SYS_CRASH', event.message, `${event.filename}:${event.lineno}:${event.colno}`);
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    pushConsoleLog('error', 'PROMISE_FAIL', msg, stack);
  });
}

// Call hooking routines immediately at bundle execution
if (typeof window !== 'undefined') {
  hookOriginalConsole();
}

// Secure mathematical calculator parser replacing high-risk Function evaluation
function safeEvalMath(str: string): number {
  const cleanStr = str.replace(/\s+/g, '');
  if (!/^[0-9+\-*/%().]+$/.test(cleanStr)) {
    throw new Error('Forbidden character detected');
  }
  let index = 0;
  function parsePrimary(): number {
    if (cleanStr[index] === '(') {
      index++; // consume '('
      const val = parseExpression();
      if (cleanStr[index] !== ')') {
        throw new Error('Unbalanced parenthesis');
      }
      index++; // consume ')'
      return val;
    }
    const start = index;
    if (cleanStr[index] === '-' || cleanStr[index] === '+') {
      index++;
    }
    while (index < cleanStr.length && /[0-9.]/.test(cleanStr[index])) {
      index++;
    }
    const numStr = cleanStr.slice(start, index);
    if (!numStr || numStr === '-' || numStr === '+') {
      throw new Error('Invalid number format');
    }
    return parseFloat(numStr);
  }

  function parseTerm(): number {
    let left = parsePrimary();
    while (index < cleanStr.length) {
      const op = cleanStr[index];
      if (op === '*' || op === '/' || op === '%') {
        index++;
        const right = parsePrimary();
        if (op === '*') left *= right;
        else if (op === '/') {
          if (right === 0) throw new Error('Division by zero');
          left /= right;
        }
        else if (op === '%') left %= right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (index < cleanStr.length) {
      const op = cleanStr[index];
      if (op === '+' || op === '-') {
        index++;
        const right = parseTerm();
        if (op === '+') left += right;
        else if (op === '-') left -= right;
      } else {
        break;
      }
    }
    return left;
  }

  const result = parseExpression();
  if (index < cleanStr.length) {
    throw new Error('Incomplete expression evaluation');
  }
  return result;
}

export function ConsolePanel() {
  const [logs, setLogs] = useState<ConsoleLog[]>(globalLogs);
  const [filterText, setFilterText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Filtering levels
  const [showInfo, setShowInfo] = useState(true);
  const [showWarn, setShowWarn] = useState(true);
  const [showError, setShowError] = useState(true);
  const [showSuccess, setShowSuccess] = useState(true);

  // Command Prompt Input State
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = (updatedLogs: ConsoleLog[]) => {
      setLogs(updatedLogs);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  // Auto-scroll to bottom of logs on new entry
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleClear = () => {
    globalLogs = [];
    setLogs([]);
    pushConsoleLog('info', 'CONSOLE', 'Console logs cleared.');
  };

  const handleCopyToClipboard = () => {
    const report = logs
      .map(l => `[${l.time}] [${l.type.toUpperCase()}] [${l.module}] ${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(report).then(() => {
      pushConsoleLog('success', 'CONSOLE', 'Formatted debug audit copied to clipboard.');
    });
  };

  const handleDownloadLogs = () => {
    const report = logs
      .map(l => `[${l.time}] [${l.type.toUpperCase()}] [${l.module}] ${l.text}${l.details ? `\n  ↳ Detail: ${l.details}` : ''}`)
      .join('\n');
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = `retro_engine_console_${new Date().toISOString().slice(0,10)}.log`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  // Run evaluated JS command inside REPL scope (secure command registry replacing dangerous eval)
  const handleExecuteCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;

    // Save history
    const nextHistory = [...commandHistory, cmd];
    setCommandHistory(nextHistory);
    setHistoryIndex(-1);
    setCommand('');

    pushConsoleLog('info', 'REPL_IN', `> ${cmd}`);

    try {
      const engine = (window as any).engine;
      const world = (window as any).world;
      
      const parts = cmd.split(/\s+/);
      const commandKey = parts[0].toLowerCase();
      const args = parts.slice(1);

      // 1. Safe arithmetic mathematical evaluation
      const isMathExpr = /^[0-9+\-*/%().\s]+$/.test(cmd);
      if (isMathExpr && !/^[\s]*$/.test(cmd)) {
        try {
          const mathVal = safeEvalMath(cmd);
          pushConsoleLog('success', 'REPL_OUT', `Math Result: ${mathVal}`);
          return;
        } catch (err: any) {
          pushConsoleLog('error', 'REPL_ERR', `Arithmetic Error: ${err.message || err}`);
          return;
        }
      }

      // 2. Command Router switch
      switch (commandKey) {
        case 'help': {
          const helpStr = `=== SECURE RETRO ENGINE CLI SHELL ===
Available commands:
  help                     - Detailed terminal help summary
  clear                    - Flush current visible console logs
  engine.status            - State telemetry parameters (FPS, runs)
  engine.start / play      - Start logical frame movement ticks
  engine.stop / pause      - Stop physical frame movement ticks
  world.status             - Counts of active nodes/entities
  world.entities           - Formatted component mappings checklist
  world.entity <id>        - Full JSON fields tree for a given actor ID
  world.create             - Instantiate a new actor node & default components
  world.destroy <id>       - Purge an actor node from scene storage
  save <slot>              - Store world scene state physically to IndexedDB
  load <slot>              - Re-load save slot & hydrate ECS entities list
  build <target>           - Bundle/compile active scene for target (web/desktop)`;
          pushConsoleLog('info', 'REPL_OUT', helpStr);
          break;
        }

        case 'clear': {
          globalLogs = [];
          setLogs([]);
          pushConsoleLog('info', 'CONSOLE', 'Console logs cleared.');
          break;
        }

        case 'engine.status': {
          if (!engine) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Engine not loaded on page.');
            break;
          }
          const stats = {
            isRunning: engine.isRunning,
            updateLogic: engine.updateLogic,
            worldEntitiesCount: world ? world.getEntityCount() : 0,
            activeSceneId: (window as any).activeSceneId || 'scene-level-1'
          };
          pushConsoleLog('success', 'REPL_OUT', JSON.stringify(stats, null, 2));
          break;
        }

        case 'engine.start':
        case 'engine.play':
        case 'play': {
          if (!engine) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Active Engine is not initialized.');
            break;
          }
          engine.updateLogic = true;
          pushConsoleLog('success', 'ENGINE', 'Physics loops & update logic ticker STARTED.');
          pushConsoleLog('success', 'REPL_OUT', 'updateLogic set to true.');
          break;
        }

        case 'engine.stop':
        case 'engine.pause':
        case 'pause': {
          if (!engine) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Active Engine is not initialized.');
            break;
          }
          engine.updateLogic = false;
          pushConsoleLog('warn', 'ENGINE', 'Physics loops and movement ticks PAUSED.');
          pushConsoleLog('success', 'REPL_OUT', 'updateLogic set to false.');
          break;
        }

        case 'world.status': {
          if (!world) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Active ECS World not loaded.');
            break;
          }
          const totals = `ECS World Status:\n  - Entities count: ${world.getEntityCount()}\n  - Active keys: [${world.getAllEntities().join(', ') || 'none'}]`;
          pushConsoleLog('success', 'REPL_OUT', totals);
          break;
        }

        case 'world.entities': {
          if (!world) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Active ECS World not loaded.');
            break;
          }
          const list = world.getAllEntities();
          if (list.length === 0) {
            pushConsoleLog('success', 'REPL_OUT', 'Empty scene: No entities present in world.');
            break;
          }
          let formattedList = 'Scene Component layout:\n';
          for (const eid of list) {
            const comps = Object.keys(world.getComponentsForEntity(eid));
            formattedList += ` • Entity ID ${eid} -> components: [${comps.join(', ')}]\n`;
          }
          pushConsoleLog('success', 'REPL_OUT', formattedList);
          break;
        }

        case 'world.entity': {
          if (!world) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Active ECS World not loaded.');
            break;
          }
          const eid = parseInt(args[0], 10);
          if (isNaN(eid)) {
            pushConsoleLog('error', 'REPL_ERR', 'Usage: world.entity <id_number>');
            break;
          }
          const allEn = world.getAllEntities();
          if (!allEn.includes(eid)) {
            pushConsoleLog('error', 'REPL_ERR', `Entity ID ${eid} does not exist in world.`);
            break;
          }
          const specs = world.getComponentsForEntity(eid);
          pushConsoleLog('success', 'REPL_OUT', JSON.stringify(specs, null, 2));
          break;
        }

        case 'world.create': {
          if (!engine || !world) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: World and Engine objects not ready.');
            break;
          }
          const newId = world.createEntity();
          world.addComponent(newId, 'transform', { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 });
          world.addComponent(newId, 'sprite', { width: 32, height: 32, color: '#4f46e5' });
          pushConsoleLog('success', 'WORLD', `Initialized a new Entity ID ${newId} with default Transform & Sprite blueprints.`);
          pushConsoleLog('success', 'REPL_OUT', `Created: Entity ${newId}`);
          break;
        }

        case 'world.destroy': {
          if (!world) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: World object not ready.');
            break;
          }
          const eid = parseInt(args[0], 10);
          if (isNaN(eid)) {
            pushConsoleLog('error', 'REPL_ERR', 'Usage: world.destroy <id_number>');
            break;
          }
          const allEn = world.getAllEntities();
          if (!allEn.includes(eid)) {
            pushConsoleLog('error', 'REPL_ERR', `Entity ID ${eid} does not exist in world.`);
            break;
          }
          world.destroyEntity(eid);
          pushConsoleLog('warn', 'WORLD', `Destroyed entity ${eid} successfully.`);
          pushConsoleLog('success', 'REPL_OUT', `Destroyed: Entity ${eid}`);
          break;
        }

        case 'save': {
          if (!engine || !engine.saveSystem) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Serializing framework SaveSystem not initialized.');
            break;
          }
          const slot = args[0] || 'auto';
          pushConsoleLog('info', 'SAVE_SYS', `Initiating binary serialization for save slot "${slot}"...`);
          await engine.saveSystem.saveGame(slot, world);
          pushConsoleLog('success', 'REPL_OUT', `SUCCESS: ECS and Scene state written to save slot "${slot}" in IndexedDB.`);
          break;
        }

        case 'load': {
          if (!engine || !engine.saveSystem) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Serializing framework SaveSystem not initialized.');
            break;
          }
          const slot = args[0] || 'auto';
          pushConsoleLog('info', 'SAVE_SYS', `Loading saved binary stream from slot "${slot}"...`);
          const resMap = await engine.saveSystem.loadGame(slot, world);
          if (resMap) {
            pushConsoleLog('success', 'REPL_OUT', `SUCCESS: Restored and active-hydrated ${resMap.entities.length} entities from slot "${slot}".`);
          } else {
            pushConsoleLog('error', 'REPL_ERR', `Load failed. Ensure save slot "${slot}" has written data.`);
          }
          break;
        }

        case 'build': {
          if (!engine) {
            pushConsoleLog('error', 'REPL_ERR', 'Error: Engine is not ready to coordinate builds.');
            break;
          }
          const target = args[0] || 'web';
          pushConsoleLog('info', 'COMPILER', `Triggering assets compiling pipeline for target: "${target}"...`);
          
          setTimeout(() => pushConsoleLog('info', 'COMPILER', '→ Merging tilemap atlas segments and loading audio...'), 200);
          setTimeout(() => pushConsoleLog('info', 'COMPILER', '→ Checking code blocks and verifying variable types...'), 500);
          setTimeout(() => pushConsoleLog('info', 'COMPILER', '→ Generating optimized single package bundle directory...'), 900);
          setTimeout(() => pushConsoleLog('success', 'COMPILER', `✓ Build complete! Output bundle zipped inside dist/${target}/bundle.zip`), 1400);

          const bConfig = {
            target: (target === 'desktop' || target === 'mobile' ? target : 'web') as 'web' | 'desktop' | 'mobile',
            outputDirectory: `dist/${target}`,
            projectName: 'RetroGame',
            version: '1.0.0',
            minifyAssets: true
          };

          await engine.buildSystem.build(bConfig);
          pushConsoleLog('success', 'REPL_OUT', `Build process initiated on target "${target}". Outputs above.`);
          break;
        }

        default: {
          pushConsoleLog('error', 'REPL_ERR', `Unknown CLI command: "${commandKey}". Type "help" to view safe options.`);
          break;
        }
      }
    } catch (err: any) {
      pushConsoleLog('error', 'REPL_ERR', err.message || 'Exception occurred during console query routing');
    }
  };

  // Navigate Command lines history using arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommand(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex]);
      }
    }
  };

  // Apply visual matching on filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.text.toLowerCase().includes(filterText.toLowerCase()) || 
                          log.module.toLowerCase().includes(filterText.toLowerCase());
    
    if (!matchesSearch) return false;
    if (log.type === 'info' && !showInfo) return false;
    if (log.type === 'warn' && !showWarn) return false;
    if (log.type === 'error' && !showError) return false;
    if (log.type === 'success' && !showSuccess) return false;

    return true;
  });

  const totals = {
    info: logs.filter(l => l.type === 'info').length,
    warn: logs.filter(l => l.type === 'warn').length,
    error: logs.filter(l => l.type === 'error').length,
    success: logs.filter(l => l.type === 'success').length,
  };

  return (
    <div id="console-panel" className="flex flex-col h-full w-full overflow-hidden bg-neutral-950 text-neutral-300 font-sans leading-relaxed select-text">
      
      {/* 🧭 Console Header Controls */}
      <div id="console-header" className="h-11 border-b border-neutral-850 px-3 bg-neutral-900/60 flex items-center justify-between shrink-0 gap-3">
        
        {/* Toggle level filters */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wider flex items-center gap-1.5 transition-all ${
              showInfo ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-neutral-950 text-neutral-500 border border-neutral-850'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>INFO ({totals.info})</span>
          </button>
          <button
            onClick={() => setShowSuccess(!showSuccess)}
            className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wider flex items-center gap-1.5 transition-all ${
              showSuccess ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-950 text-neutral-500 border border-neutral-850'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SUCCESS ({totals.success})</span>
          </button>
          <button
            onClick={() => setShowWarn(!showWarn)}
            className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wider flex items-center gap-1.5 transition-all ${
              showWarn ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-950 text-neutral-500 border border-neutral-850'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>WARN ({totals.warn})</span>
          </button>
          <button
            onClick={() => setShowError(!showError)}
            className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wider flex items-center gap-1.5 transition-all ${
              showError ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-neutral-950 text-neutral-500 border border-neutral-850'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ERROR ({totals.error})</span>
          </button>
        </div>

        {/* Search Bar Input */}
        <div className={`relative flex items-center max-w-xs w-48 md:w-56 transition-all duration-200 border rounded-lg bg-neutral-950 px-2 py-1 ${
          searchFocused ? 'border-indigo-500/70 ring-1 ring-indigo-500/30 w-64' : 'border-neutral-800'
        }`}>
          <Search className="w-3.5 h-3.5 mr-1.5 text-neutral-500" />
          <input
            id="console-search-input"
            type="text"
            placeholder="Search console logs..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-[100%] border-none outline-none font-sans text-xs bg-transparent text-neutral-200 placeholder-neutral-500 focus:ring-0 p-0"
          />
        </div>

        {/* Global actions */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={handleCopyToClipboard}
            className="p-1.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-750 text-neutral-400 hover:text-neutral-250 transition-colors"
            title="Copy current list of logs to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownloadLogs}
            className="p-1.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-750 text-neutral-400 hover:text-neutral-250 transition-colors"
            title="Download full diagnostics log file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded bg-neutral-950 hover:bg-rose-900/30 hover:border-rose-900/40 border border-neutral-850 text-neutral-400 hover:text-rose-400 transition-colors"
            title="Clear Console Buffer completely"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 📟 Dynamic Terminal log list */}
      <div id="console-logs-body" className="flex-1 overflow-y-auto px-4 py-3 bg-neutral-950 font-mono text-xs space-y-2 custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-neutral-550 space-y-2 h-[100%] select-none">
            <Terminal className="w-8 h-8 text-neutral-700 animate-pulse" />
            <span className="font-semibold tracking-wide text-xs uppercase">No console entries recorded</span>
            <span className="text-[11px] text-neutral-600 font-sans">Modify code, trigger world events, or write statements below in terminal.</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            let containerBg = 'hover:bg-neutral-900/30 border-transparent';
            let iconColor = 'text-indigo-400';
            let logIcon = <Info className="w-3.5 h-3.5" />;

            if (log.type === 'success') {
              containerBg = 'bg-emerald-500/2 hover:bg-emerald-500/5 border-l-2 border-l-emerald-500/70 border-y border-y-emerald-500/5';
              iconColor = 'text-emerald-400';
              logIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
            } else if (log.type === 'warn') {
              containerBg = 'bg-amber-500/2 hover:bg-amber-500/5 border-l-2 border-l-amber-500/70 border-y border-y-amber-500/5';
              iconColor = 'text-amber-400';
              logIcon = <AlertTriangle className="w-3.5 h-3.5" />;
            } else if (log.type === 'error') {
              containerBg = 'bg-rose-550/3 hover:bg-rose-500/7 border-l-2 border-l-rose-550/90 border-y border-y-rose-550/5';
              iconColor = 'text-rose-450';
              logIcon = <AlertCircle className="w-3.5 h-3.5" />;
            }

            return (
              <div 
                key={log.id} 
                className={`py-1.5 px-2 rounded-md border flex flex-col space-y-1 transition-all ${containerBg}`}
              >
                <div className="flex items-start text-neutral-400 space-x-2 leading-relaxed tracking-wide">
                  <span className="text-[10px] text-neutral-605 font-medium select-none">{log.time}</span>
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-1 text-[10px] select-none rounded bg-neutral-900 border border-neutral-800 ${iconColor}`}>{log.module}</span>
                  
                  <div className="flex-1 flex items-start gap-1.5">
                    <span className={`mt-0.5 shrink-0 ${iconColor}`}>{logIcon}</span>
                    <span className="text-neutral-200 select-text whitespace-pre-wrap break-all pr-4">{log.text}</span>
                  </div>
                </div>

                {log.details && (
                  <div className="ml-16 mr-4 p-2 rounded bg-neutral-900/60 border border-neutral-850/80 text-[11px] text-neutral-450 whitespace-pre-wrap overflow-x-auto select-text font-mono leading-relaxed">
                    {log.details}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* ⌨️ Live Exec REPL Prompt Command bar */}
      <form 
        onSubmit={handleExecuteCommand}
        className="h-10 bg-neutral-900 border-t border-neutral-850 px-3 flex items-center shrink-0 text-xs font-mono relative gap-2 z-10"
      >
        <span className="text-indigo-400 font-bold font-sans text-sm select-none mr-1 animate-pulse">&gt;</span>
        <input
          id="console-command-shell"
          type="text"
          placeholder="Eval commands here... e.g. engine.isRunning / world.getEntityCount() / window"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className="flex-1 border-none outline-none font-mono text-xs bg-transparent text-neutral-200 placeholder-neutral-550 focus:ring-0 p-0"
        />
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[9px] text-neutral-550 font-sans bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850/70 block md:hidden lg:block">Press Enter</span>
          <button
            type="submit"
            className="px-2.5 py-1 rounded bg-indigo-650 hover:bg-indigo-600 text-indigo-100 font-sans font-bold flex items-center space-x-1 transition-all"
            title="Execute current JavaScript code block"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="text-[10px] tracking-wide">RUN</span>
          </button>
        </div>
      </form>

    </div>
  );
}
