import { useWorkspaceStore } from '../../state/workspace.store';
import { pushConsoleLog } from '../console-panel/ConsolePanel';
import { SceneView } from '../scene-editor/SceneView';
import { TilemapEditor } from '../tilemap-editor/TilemapEditor';
import { AnimationEditor } from '../animation-editor/AnimationEditor';
import { EventEditor } from '../event-editor/EventEditor';
import { UiEditor } from '../ui-editor/UiEditor';
import { SpriteEditor } from '../sprite-editor/SpriteEditor';
import { Map, LayoutGrid, Wand2, Network, Box, Layers, Palette } from 'lucide-react';

export function CenterWorkspace() {
  const mainTab = useWorkspaceStore((state) => state.mainTab);
  const setMainTab = useWorkspaceStore((state) => state.setMainTab);

  const addLog = (module: string, text: string, type: 'info' | 'warn' | 'success' | 'error' = 'info') => {
    pushConsoleLog(type, module, text);
  };

  return (
    <div id="retro-center-workspace" className="flex-1 flex flex-col h-full overflow-hidden w-full bg-neutral-950">
      
      {/* Main Visual tabbed frame */}
      <div className="h-10 bg-neutral-900 border-b border-neutral-850 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center space-x-1.5">
          {[
            { id: 'scene', label: 'Scene View', icon: Map, color: 'text-indigo-400' },
            { id: 'tilemap', label: 'Tilemap Paint', icon: LayoutGrid, color: 'text-emerald-400' },
            { id: 'tileset', label: 'Tileset Studio', icon: Layers, color: 'text-purple-400' },
            { id: 'sprite', label: 'Sprite Studio', icon: Palette, color: 'text-pink-400' },
            { id: 'animation', label: 'Animator Board', icon: Wand2, color: 'text-amber-400' },
            { id: 'events', label: 'Event Blocks', icon: Network, color: 'text-cyan-400' },
            { id: 'ui', label: 'HUD Canvas', icon: Box, color: 'text-rose-400' },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const active = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setMainTab(tab.id as any);
                  addLog('DOCK_MGR', `Rendered viewport tab: ${tab.label}`, 'info');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t-lg border-b-2 tracking-wide transition-all ${
                  active 
                    ? 'bg-neutral-950 text-indigo-100 border-b-indigo-500/90 py-1.5 opacity-100' 
                    : 'text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300 border-b-transparent opacity-85'
                }`}
              >
                <TabIcon className={`w-3.5 h-3.5 ${active ? tab.color : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Central Active Viewport Content */}
      <div className="flex-1 min-h-0 relative bg-neutral-950">
        
        {/* Viewport 1: Pure Engine Scene Canvas View (PERSISTED) */}
        <div className={`absolute inset-0 ${mainTab === 'scene' ? 'block' : 'hidden'}`}>
          <SceneView />
        </div>

        {/* Viewport 2: Tilemap level brush painter */}
        {mainTab === 'tilemap' && (
          <div className="absolute inset-0">
            <TilemapEditor initialMode="paint" />
          </div>
        )}

        {/* Viewport 2.5: Dynamic Tileset Studio and custom asset pipeline */}
        {mainTab === 'tileset' && (
          <div className="absolute inset-0">
            <TilemapEditor initialMode="splicer" />
          </div>
        )}

        {/* Viewport 2.7: Sprite Studio */}
        {mainTab === 'sprite' && (
          <div className="absolute inset-0">
            <SpriteEditor />
          </div>
        )}

        {/* Viewport 3: Character Animator and keyframe editor */}
        {mainTab === 'animation' && (
          <div className="absolute inset-0">
            <AnimationEditor />
          </div>
        )}

        {/* Viewport 4: Visual Logic and Node Block Flow */}
        {mainTab === 'events' && (
          <div className="absolute inset-0">
            <EventEditor />
          </div>
        )}

        {/* Viewport 5: Head interfaces Overlay Designer */}
        {mainTab === 'ui' && (
          <div className="absolute inset-0">
            <UiEditor />
          </div>
        )}

      </div>
    </div>
  );
}
