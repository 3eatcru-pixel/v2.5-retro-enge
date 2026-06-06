import { useWorkspaceStore } from '../../state/workspace.store';
import { AssetBrowser } from '../asset-browser/AssetBrowser';
import { AssetHealthView } from '../asset-health/AssetHealthView';
import { AudioEditor } from '../audio-editor/AudioEditor';
import { ConsolePanel, pushConsoleLog } from '../console-panel/ConsolePanel';
import { FolderOpen, Volume2, Terminal, FileBox } from 'lucide-react';

export function BottomDrawer() {
  const bottomOpen = useWorkspaceStore((state) => state.bottomOpen);
  const bottomTab = useWorkspaceStore((state) => state.bottomTab);
  const setBottomTab = useWorkspaceStore((state) => state.setBottomTab);
  const bottomPanelHeight = useWorkspaceStore((state) => state.bottomPanelHeight);
  const setBottomPanelHeight = useWorkspaceStore((state) => state.setBottomPanelHeight);

  const addLog = (module: string, text: string, type: 'info' | 'warn' | 'success' | 'error' = 'info') => {
    pushConsoleLog(type, module, text);
  };

  if (!bottomOpen) return null;

  return (
    <div id="retro-bottom-drawer" style={{ height: `${bottomPanelHeight}px` }} className="border-t border-neutral-800 bg-neutral-900 flex flex-col shrink-0 relative">
      {/* Splitter Handle */}
      <div 
        className="absolute top-0 left-0 w-full h-1.5 -mt-0.5 cursor-row-resize hover:bg-indigo-500/50 z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          const startY = e.clientY;
          const startH = bottomPanelHeight;
          
          const onMove = (me: PointerEvent) => {
            setBottomPanelHeight(startH - (me.clientY - startY));
          };
          
          const onUp = (ue: PointerEvent) => {
            (ue.target as HTMLElement).releasePointerCapture(ue.pointerId);
            (ue.target as HTMLElement).removeEventListener('pointermove', onMove);
            (ue.target as HTMLElement).removeEventListener('pointerup', onUp);
          };
          
          (e.target as HTMLElement).addEventListener('pointermove', onMove);
          (e.target as HTMLElement).addEventListener('pointerup', onUp);
        }}
      />
      
      {/* Bottom drawer tabs */}
      <div className="h-9 bg-neutral-900 border-b border-neutral-850 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center space-x-1.5 h-full">
          {[
            { id: 'assets', label: 'Asset Browser', icon: FolderOpen, color: 'text-indigo-400' },
            { id: 'health', label: 'Asset Health', icon: FileBox, color: 'text-rose-400' },
            { id: 'audio', label: 'Audio Mixer', icon: Volume2, color: 'text-emerald-400' },
            { id: 'logs', label: 'System Logs', icon: Terminal, color: 'text-amber-400' },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const active = bottomTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setBottomTab(tab.id as any);
                  addLog('DOCK_MGR', `Rendered bottom drawer tab: ${tab.label}`, 'info');
                }}
                className={`flex items-center space-x-1.5 px-3 h-full text-xs font-semibold border-b-2 tracking-wide transition-all ${
                  active 
                    ? 'text-indigo-400 border-b-indigo-500 bg-neutral-950/40 opacity-100' 
                    : 'text-neutral-500 hover:text-neutral-300 border-b-transparent opacity-80'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => addLog('SYSTEM', 'Cleared log diagnostics console', 'warn')} 
            className="text-[10px] font-mono text-neutral-500 hover:text-neutral-300 px-2 py-0.5 hover:bg-neutral-800 border border-neutral-850 rounded"
          >
            Clear Slate
          </button>
        </div>
      </div>

      {/* Bottom drawer tabs panel active content */}
      <div className="flex-1 overflow-hidden relative bg-neutral-950/65">
        
        {bottomTab === 'assets' && (
          <div className="w-full h-full">
            <AssetBrowser />
          </div>
        )}

        {bottomTab === 'audio' && (
          <div className="w-full h-full">
            <AudioEditor />
          </div>
        )}

        {bottomTab === 'health' && (
          <div className="w-full h-full">
            <AssetHealthView />
          </div>
        )}

        {bottomTab === 'logs' && (
          <div className="w-full h-full">
            <ConsolePanel />
          </div>
        )}

      </div>
    </div>
  );
}
