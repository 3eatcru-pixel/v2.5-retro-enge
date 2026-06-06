import { useProjectStore } from '../../state/project.store';
import { useWorkspaceStore } from '../../state/workspace.store';
import { useEngineStore } from '../../state/engine.store';
import { pushConsoleLog } from '../console-panel/ConsolePanel';
import { ProjectExporter } from '../exporter/ProjectExporter';
import { RetroStorage } from '../../core/storage/RetroStorage';
import { 
  Play, Square, ChevronLeft,
  PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, 
  PanelBottomClose, PanelBottom, Download, ExternalLink
} from 'lucide-react';

interface EditorToolbarProps {
  isPlaying: boolean;
  handlePlay: () => void;
  handleStop: () => void;
}

export function EditorToolbar({ isPlaying, handlePlay, handleStop }: EditorToolbarProps) {
  const setMode = useProjectStore((state) => state.setMode);
  const projectName = useProjectStore((state) => state.projectName);
  const engine = useEngineStore((state) => state.engine);
  
  const handleExport = () => {
    if (engine) {
      ProjectExporter.exportWebProject(engine, projectName);
    }
  };

  const handleHotPlay = async () => {
    if (engine) {
      const bundle = ProjectExporter.getProjectBundle(engine, projectName);
      pushConsoleLog('info', 'PLAYER', `Caching project bundle to high-capacity RetroStorage...`);
      await RetroStorage.setItem('retro_hot_project', JSON.stringify(bundle));
      pushConsoleLog('info', 'PLAYER', `Launching Hot Play...`);
      window.open('/player.html', '_blank', 'width=800,height=600');
    }
  };

  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const setMainTab = useWorkspaceStore((state) => state.setMainTab);
  const setBottomTab = useWorkspaceStore((state) => state.setBottomTab);
  const leftOpen = useWorkspaceStore((state) => state.leftOpen);
  const setLeftOpen = useWorkspaceStore((state) => state.setLeftOpen);
  const rightOpen = useWorkspaceStore((state) => state.rightOpen);
  const setRightOpen = useWorkspaceStore((state) => state.setRightOpen);
  const bottomOpen = useWorkspaceStore((state) => state.bottomOpen);
  const setBottomOpen = useWorkspaceStore((state) => state.setBottomOpen);

  const addLog = (module: string, text: string, type: 'info' | 'warn' | 'success' | 'error' = 'info') => {
    pushConsoleLog(type, module, text);
  };

  const handleApplyWorkspace = (preset: 'general' | 'tiles' | 'anim' | 'sound' | 'logic') => {
    setActiveWorkspace(preset);
    if (preset === 'general') {
      setMainTab('scene');
      setBottomTab('assets');
      setLeftOpen(true);
      setRightOpen(true);
      setBottomOpen(true);
      addLog('WORKSPACE', 'Switched to Level and Game Designer Workspace', 'info');
    } else if (preset === 'tiles') {
      setMainTab('tilemap');
      setBottomTab('assets');
      setLeftOpen(true);
      setRightOpen(true);
      setBottomOpen(true);
      addLog('WORKSPACE', 'Switched to Tilemap Brush Work Toolspace', 'info');
    } else if (preset === 'anim') {
      setMainTab('animation');
      setBottomTab('assets');
      setLeftOpen(true);
      setRightOpen(true);
      setBottomOpen(true);
      addLog('WORKSPACE', 'Switched to Character Animator Studio', 'info');
    } else if (preset === 'sound') {
      setMainTab('scene');
      setBottomTab('audio');
      setLeftOpen(true);
      setRightOpen(true);
      setBottomOpen(true);
      addLog('WORKSPACE', 'Switched to FX & Music Station', 'info');
    } else if (preset === 'logic') {
      setMainTab('events');
      setBottomTab('assets');
      setLeftOpen(true);
      setRightOpen(true);
      setBottomOpen(true);
      addLog('WORKSPACE', 'Switched to State and Logic Events graph', 'info');
    }
  };

  return (
    <header id="retro-editor-toolbar" className="h-14 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between px-4 shrink-0 shadow-lg relative z-20">
      <div className="flex items-center space-x-4">
        <button 
          id="back-to-dashboard-btn"
          onClick={() => setMode('dashboard')}
          className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200"
          title="Back to Dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Retro Game Engine SDK</span>
          <span className="text-sm font-semibold tracking-wide text-neutral-100">{projectName}</span>
        </div>

        <div className="hidden h-6 w-[1px] bg-neutral-800 md:block" />

        {/* Core Workspace Selector Dropdown */}
        <div className="flex items-center space-x-1 ml-4">
          <span className="text-xs text-neutral-500 mr-2">Workspace:</span>
          <select
            id="workspace-preset-selector"
            value={activeWorkspace}
            onChange={(e) => handleApplyWorkspace(e.target.value as any)}
            className="bg-neutral-950 text-neutral-300 border border-neutral-800 hover:border-neutral-700 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          >
            <option value="general">Level & Game Design</option>
            <option value="tiles">Tilemap Painter</option>
            <option value="anim">Character Animator</option>
            <option value="sound">Sound FX & Music</option>
            <option value="logic">State & Scripts</option>
          </select>
        </div>
      </div>

      {/* Play & Stop Simulation Engine Controls */}
      <div className="flex items-center space-x-2">
        <button 
          id="play-simulation-btn"
          onClick={handlePlay}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-semibold tracking-wider transition-all ${isPlaying ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-neutral-400 hover:bg-neutral-800 hover:text-emerald-400'}`} 
          title="Run Simulation"
        >
          <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-white' : ''}`} />
          <span>RUN</span>
        </button>
        <button 
          id="stop-simulation-btn"
          onClick={handleStop}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-semibold tracking-wider transition-all ${!isPlaying ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-neutral-400 hover:bg-neutral-800 hover:text-rose-400'}`} 
          title="Stop Simulation"
        >
          <Square className={`w-3.5 h-3.5 ${!isPlaying ? 'fill-white' : ''}`} />
          <span>PAUSE</span>
        </button>
      </div>

      {/* Toggle Dock Layout Sidebars */}
      <div className="flex items-center space-x-4">
        
        <button
          onClick={handleHotPlay}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-900 text-emerald-400 font-bold uppercase tracking-wider text-[10px] rounded transition-colors"
          title="Play in New Window"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Hot Play</span>
        </button>

        <button
          onClick={handleExport}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-800 text-neutral-300 font-bold uppercase tracking-wider text-[10px] rounded border border-neutral-800 transition-colors"
          title="Export Project (JSON)"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export</span>
        </button>

        <div className="flex items-center space-x-0.5 border-neutral-800">
          <button
            id="toggle-left-dock-btn"
            onClick={() => setLeftOpen(!leftOpen)}
            className={`p-2 rounded-lg transition-all ${leftOpen ? 'bg-indigo-600/10 text-indigo-400' : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-800'}`}
            title="Toggle Left Panels"
          >
            {leftOpen ? <PanelLeftClose className="w-4.5 h-4.5" /> : <PanelLeft className="w-4.5 h-4.5" />}
          </button>
          <button
            id="toggle-bottom-dock-btn"
            onClick={() => setBottomOpen(!bottomOpen)}
            className={`p-2 rounded-lg transition-all ${bottomOpen ? 'bg-indigo-600/10 text-indigo-400' : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-800'}`}
            title="Toggle Bottom Console Drawer"
          >
            {bottomOpen ? <PanelBottomClose className="w-4.5 h-4.5" /> : <PanelBottom className="w-4.5 h-4.5" />}
          </button>
          <button
            id="toggle-right-dock-btn"
            onClick={() => setRightOpen(!rightOpen)}
            className={`p-2 rounded-lg transition-all ${rightOpen ? 'bg-indigo-600/10 text-indigo-400' : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-800'}`}
            title="Toggle Properties Panel"
          >
            {rightOpen ? <PanelRightClose className="w-4.5 h-4.5" /> : <PanelRight className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
