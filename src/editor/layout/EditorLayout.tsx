import { useState, useEffect } from 'react';
import { useEngineStore } from '../../state/engine.store';
import { useEditorStore } from '../../state/editor.store';
import { pushConsoleLog } from '../console-panel/ConsolePanel';

// Layout Slots components
import { EditorToolbar } from './EditorToolbar';
import { LeftSidebar } from './LeftSidebar';
import { CenterWorkspace } from './CenterWorkspace';
import { RightSidebar } from './RightSidebar';
import { BottomDrawer } from './BottomDrawer';

export function EditorLayout() {
  const engine = useEngineStore((state) => state.engine);
  const forceUpdate = useEditorStore((state) => state.forceUpdate);
  const activeTheme = useEditorStore((state) => state.activeTheme);
  const [isPlaying, setIsPlaying] = useState(false);

  // Hotkeys for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!engine) return;
        if (e.shiftKey) {
          engine.commands.redo();
          pushConsoleLog('info', 'COMMAND', 'Redo applied.');
        } else {
          engine.commands.undo();
          pushConsoleLog('info', 'COMMAND', 'Undo applied.');
        }
        forceUpdate(); // Re-render editor UI to reflect changes
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!engine) return;
        engine.commands.redo();
        pushConsoleLog('info', 'COMMAND', 'Redo applied.');
        forceUpdate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, forceUpdate]);

  const handlePlay = () => {
    setIsPlaying(true);
    if (engine) engine.updateLogic = true;
    pushConsoleLog('success', 'GAME', 'Simulation began running at 60Hz');
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (engine) engine.updateLogic = false;
    pushConsoleLog('warn', 'GAME', 'Simulation stopped');
  };

  return (
    <div id="retro-editor-wrapper" className={`flex flex-col h-full w-full overflow-hidden bg-neutral-950 text-neutral-300 font-sans select-none antialiased theme-${activeTheme}`}>
      <EditorToolbar 
        isPlaying={isPlaying} 
        handlePlay={handlePlay} 
        handleStop={handleStop}
      />

      <div id="retro-editor-body" className="flex-1 flex overflow-hidden w-full relative">
        {/* Left and Center Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden w-0 min-w-0 bg-neutral-950">
          <div className="flex-1 flex overflow-hidden w-full relative">
            <LeftSidebar />
            <CenterWorkspace />
          </div>
          <BottomDrawer />
        </div>

        {/* Right Sidebar (Full Height) */}
        <RightSidebar />
      </div>
    </div>
  );
}

