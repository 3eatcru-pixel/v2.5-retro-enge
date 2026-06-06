import { useWorkspaceStore } from '../../state/workspace.store';
import { InspectorPanel } from '../inspector/InspectorPanel';

export function RightSidebar() {
  const rightOpen = useWorkspaceStore((state) => state.rightOpen);
  const rightPanelWidth = useWorkspaceStore((state) => state.rightPanelWidth);
  const setRightPanelWidth = useWorkspaceStore((state) => state.setRightPanelWidth);

  if (!rightOpen) return null;

  return (
    <aside id="retro-right-sidebar" style={{ width: `${rightPanelWidth}px` }} className="bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 flex-grow-0 h-full relative z-15">
      {/* Splitter Handle */}
      <div 
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          const startX = e.clientX;
          const startW = rightPanelWidth;
          
          const onMove = (me: PointerEvent) => {
            setRightPanelWidth(startW - (me.clientX - startX));
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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <InspectorPanel />
      </div>
    </aside>
  );
}
