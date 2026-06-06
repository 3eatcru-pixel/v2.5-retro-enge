import { useWorkspaceStore } from '../../state/workspace.store';
import { HierarchyPanel } from '../hierarchy/HierarchyPanel';
import { CreatorToolkit } from '../creation-toolkit/CreatorToolkit';
import { Sparkles, FolderTree } from 'lucide-react';

export function LeftSidebar() {
  const leftOpen = useWorkspaceStore((state) => state.leftOpen);
  const leftTab = useWorkspaceStore((state) => state.leftTab);
  const setLeftTab = useWorkspaceStore((state) => state.setLeftTab);
  const leftPanelWidth = useWorkspaceStore((state) => state.leftPanelWidth);
  const setLeftPanelWidth = useWorkspaceStore((state) => state.setLeftPanelWidth);

  if (!leftOpen) return null;

  return (
    <aside id="retro-left-sidebar" style={{ width: `${leftPanelWidth}px` }} className="bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 flex-grow-0 h-full relative z-15">
      {/* Tab Toggles */}
      <div className="h-10 border-b border-neutral-800 bg-neutral-900 shrink-0 flex items-center p-1.5 space-x-1 select-none">
        <button
          onClick={() => setLeftTab('creator')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1 px-2.5 h-full text-xs font-bold rounded-md transition-all ${
            leftTab === 'creator' 
              ? 'bg-neutral-950 text-indigo-400 border border-neutral-800' 
              : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-850'
          }`}
          title="Creator Toolkit"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Toolkit</span>
        </button>
        <button
          onClick={() => setLeftTab('hierarchy')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1 px-2.5 h-full text-xs font-bold rounded-md transition-all ${
            leftTab === 'hierarchy' 
              ? 'bg-neutral-950 text-indigo-400 border border-neutral-800' 
              : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-850'
          }`}
          title="Scene Entities"
        >
          <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
          <span>Hierarchy</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {leftTab === 'creator' ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <CreatorToolkit />
          </div>
        ) : (
          <HierarchyPanel />
        )}
      </div>
      {/* Splitter Handle */}
      <div 
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          const startX = e.clientX;
          const startW = leftPanelWidth;
          
          const onMove = (me: PointerEvent) => {
            setLeftPanelWidth(startW + (me.clientX - startX));
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
    </aside>
  );
}
