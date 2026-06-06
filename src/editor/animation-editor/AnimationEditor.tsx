import { 
  Play, Pause, Plus, Trash2, Settings, LayoutGrid, RotateCcw, 
  ChevronLeft, ChevronRight, Copy, HelpCircle, Gamepad2, Layers, 
  Sparkles, ZoomIn, ZoomOut
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useEngineStore } from '../../state/engine.store';
import { useEditorStore } from '../../state/editor.store';
import { Animator, createAnimator } from '../../core/ecs/components/Animator';
import { Sprite } from '../../core/ecs/components/Sprite';
import { pushConsoleLog } from '../console-panel/ConsolePanel';

// Built-in high-quality pixel-art spritesheets


// Canvas-free responsive pixel frame preview renderer helper
interface ImagePreviewProps {
  assetId: string;
  engine: any;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  zoom: number;
  className?: string;
  flipX?: boolean;
}

function PixelFramePreview({ assetId, engine, fx, fy, fw, fh, zoom, className = '', flipX = false }: ImagePreviewProps) {
  const normUrl = engine?.assets?.getAssetUrl(assetId) || assetId;
  
  return (
    <div 
      className={`relative select-none overflow-hidden rounded bg-black/40 border border-neutral-800 ${className}`}
      style={{ 
        width: `${fw * zoom}px`, 
        height: `${fh * zoom}px` 
      }}
    >
      <img
        src={normUrl}
        alt="pixel frame"
        className="max-w-none pointer-events-none"
        style={{
          position: 'absolute',
          left: `-${fx * zoom}px`,
          top: `-${fy * zoom}px`,
          transform: flipX ? 'scaleX(-1)' : 'none',
          transformOrigin: 'top left',
          imageRendering: 'pixelated',
          width: 'auto',
          height: 'auto',
          // Sizing is dynamically multiplied to match the cropped portion scale perfectly
          zoom: zoom
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// Background options
const BACKDROP_STYLES = {
  grid: {
    background: 'repeating-conic-gradient(#1c1917 0% 25%, #292524 0% 50%)',
    backgroundSize: '16px 16px',
  },
  void: {
    backgroundColor: '#09090b',
    backgroundImage: 'radial-gradient(ellipse at center, rgba(39, 39, 42, 0.25) 0%, rgba(9, 9, 11, 1) 85%)'
  },
  meadow: {
    backgroundColor: '#1b4332',
    backgroundImage: 'linear-gradient(to bottom, #2d6a4f 0%, #081c15 100%)'
  },
  magma: {
    backgroundColor: '#3f0c10',
    backgroundImage: 'radial-gradient(ellipse, #7f1d1d 0%, #150005 100%)'
  },
  synthwave: {
    backgroundColor: '#06000d',
    backgroundImage: 'linear-gradient(to bottom, #140121 0%, #03000a 100%)',
    borderBottom: '3px solid #db2777'
  }
};

export function AnimationEditor() {
  const engine = useEngineStore((s) => s.engine);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const entityNames = useEditorStore((s) => s.entityNames);
  const forceUpdate = useEditorStore((s) => s.forceUpdate);
  const updateToken = useEditorStore((s) => s.editorUpdateToken);

  // States
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [sliceW, setSliceW] = useState<number>(16);
  const [sliceH, setSliceH] = useState<number>(28);
  const [sheetZoom, setSheetZoom] = useState<number>(4);
  const [selectedCell, setSelectedCell] = useState<{ u: number; v: number } | null>({ u: 0, v: 0 });
  
  const [selectedAnimName, setSelectedAnimName] = useState<string>('idle_down');
  const [playbackFrame, setPlaybackFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackMultiplier, setPlaybackMultiplier] = useState<number>(1.0);
  const [backdropTheme, setBackdropTheme] = useState<'grid' | 'void' | 'meadow' | 'magma' | 'synthwave'>('synthwave');
  const [previewZoom, setPreviewZoom] = useState<number>(6);
  const showHelperGrid = true;

  // Popovers & Creator Inputs
  const [isAddingClip, setIsAddingClip] = useState<boolean>(false);
  const [newClipNameInput, setNewClipNameInput] = useState<string>('walk_down');
  const [newClipFpsInput, setNewClipFpsInput] = useState<number>(8);
  const [newClipLoopInput, setNewClipLoopInput] = useState<boolean>(true);

  // Timeline Highlight Frame selection
  const [selectedTimelineFrameIdx, setSelectedTimelineFrameIdx] = useState<number | null>(0);

  // Playtest Simulator state inside preview window
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [sandboxPos, setSandboxPos] = useState<{ x: number; y: number }>({ x: 0, y: 70 });
  const [sandboxVy, setSandboxVy] = useState<number>(0);
  const [sandboxFacingRight, setSandboxFacingRight] = useState<boolean>(false);
  const [sandboxPhysicsStyle, setSandboxPhysicsStyle] = useState<'topdown' | 'platformer'>('topdown');
  const [sandboxGrounded, setSandboxGrounded] = useState<boolean>(true);

  // Fetch registered image assets from Asset Browser database
  const importedImageAssets = useMemo(() => {
    if (!engine) return [];
    updateToken; // subscribe to trigger updates
    return engine.assets.getAllAssets().filter((a: any) => a.metadata.type === 'image' && (a.metadata.tags?.includes('sprite') || a.metadata.tags?.includes('character') || a.metadata.tags?.includes('item')));
  }, [engine, updateToken]);

  // Use dynamically imported assets
  const availableSheets = useMemo(() => {
    return importedImageAssets.map((asset: any) => ({
      id: asset.metadata.guid,
      name: `📁 ${asset.metadata.name || 'Imported Layer'}`,
      cellW: asset.metadata.importOptions?.spriteSheet?.tileWidth || 16,
      cellH: asset.metadata.importOptions?.spriteSheet?.tileHeight || 28,
      cols: 4,
      rows: 4,
      category: (asset.metadata.tags && asset.metadata.tags[0]) ? asset.metadata.tags[asset.metadata.tags.length - 1] : 'Sprites'
    }));
  }, [importedImageAssets]);

  // Select first sheet if activeSheetId is empty
  useEffect(() => {
    if (!activeSheetId && availableSheets.length > 0) {
      setActiveSheetId(availableSheets[0].id);
    }
  }, [availableSheets, activeSheetId]);

  // Sync sheet dimensions on change
  useEffect(() => {
    const matching = availableSheets.find(s => s.id === activeSheetId);
    if (matching) {
      setSliceW(matching.cellW);
      setSliceH(matching.cellH);
    }
  }, [activeSheetId, availableSheets]);

  // Resolve entity animator component
  const animator = useMemo(() => {
    if (!engine || selectedEntityId === null) return null;
    updateToken; // subscribe to trigger updates
    try {
      return engine.world.getComponent<Animator>(selectedEntityId, 'animator');
    } catch {
      return null;
    }
  }, [engine, selectedEntityId, updateToken]);

  // Resolve current active clip inside Animator
  const currentClip = useMemo(() => {
    if (!animator || !selectedAnimName) return null;
    updateToken; // subscribe to trigger updates
    return animator.animations[selectedAnimName] || null;
  }, [animator, selectedAnimName, updateToken]);

  // Auto-select first clip when switching entities or mounting
  useEffect(() => {
    if (animator) {
      const keys = Object.keys(animator.animations);
      if (keys.length > 0 && !keys.includes(selectedAnimName)) {
        setSelectedAnimName(keys[0]);
        setPlaybackFrame(0);
        setSelectedTimelineFrameIdx(0);
      }
    }
  }, [animator, selectedAnimName]);

  // Ticking preview animation loops
  useEffect(() => {
    if (!isPlaying || !currentClip || currentClip.frames.length === 0 || isSandboxMode) return;

    const fps = currentClip.frameRate || 8;
    const rate = fps * playbackMultiplier;
    const intervalMs = Math.max(16, 1000 / rate);

    const timer = setInterval(() => {
      setPlaybackFrame((prev) => {
        const next = prev + 1;
        if (next >= currentClip.frames.length) {
          return currentClip.loop ? 0 : currentClip.frames.length - 1;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentClip, playbackMultiplier, isSandboxMode]);

  // Keyboard loop for Joystick Sandbox Mode
  const sandboxKeysRef = useRef<Record<string, boolean>>({});
  const sandboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSandboxMode) return;

    let animFrameId: number;
    let lastTime = performance.now();
    let frameAccumulator = 0;

    const physicsLoop = (timeNow: number) => {
      const dt = Math.min(0.05, (timeNow - lastTime) / 1000);
      lastTime = timeNow;

      // 1. Fetch buttons input
      const keys = sandboxKeysRef.current;
      let dx = 0;
      let dy = 0;

      if (keys['KeyA'] || keys['ArrowLeft']) {
        dx = -1;
        setSandboxFacingRight(true); // default face left
      }
      if (keys['KeyD'] || keys['ArrowRight']) {
        dx = 1;
        setSandboxFacingRight(false); // face right
      }

      if (sandboxPhysicsStyle === 'topdown') {
        if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
        if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
      }

      // Calculate state changes
      let nextState = 'idle_down';
      if (sandboxPhysicsStyle === 'topdown') {
        if (dy < 0) nextState = 'walk_up';
        else if (dy > 0) nextState = 'walk_down';
        else if (dx !== 0) {
          nextState = dx > 0 ? 'walk_right' : 'walk_left';
        } else {
          // default idle based on target direction
          if (animator?.animations['walk_up'] && animator.currentAnimation === 'walk_up') nextState = 'idle_up';
          else if (animator?.animations['walk_right'] && animator.currentAnimation === 'walk_right') nextState = 'walk_right';
          else if (animator?.animations['walk_left'] && animator.currentAnimation === 'walk_left') nextState = 'walk_left';
          else nextState = 'idle_down';
        }
      } else {
        // Platformer style
        if (dx !== 0) nextState = 'walk_right'; // standard animation list
        else nextState = 'idle_down';
      }

      // Automatically swap clips in the editor playback
      if (animator && animator.animations[nextState] && selectedAnimName !== nextState) {
        setSelectedAnimName(nextState);
        setPlaybackFrame(0);
      }

      // Physics integrations
      const speed = 120;
      setSandboxPos((prev) => {
        let nx = prev.x + dx * speed * dt;
        let ny = prev.y;

        if (sandboxPhysicsStyle === 'topdown') {
          ny = prev.y + dy * speed * dt;
        } else {
          // gravity scroller mock heights
          const gravity = 450;
          let vy = sandboxVy + gravity * dt;

          if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && sandboxGrounded) {
            vy = -200;
            setSandboxGrounded(false);
          }

          ny = prev.y + vy * dt;
          if (ny >= 70) { // arbitrary screen floor
            ny = 70;
            vy = 0;
            setSandboxGrounded(true);
          }
          setSandboxVy(vy);
        }

        // Keep inside bounds of 240x160 window
        if (nx < -90) nx = -90;
        if (nx > 90) nx = 90;
        if (ny < -70) ny = -70;
        if (ny > 70) ny = 70;

        return { x: nx, y: ny };
      });

      // Frame Animator tick inside Sandbox
      const currentSimClip = animator?.animations[nextState];
      if (currentSimClip && currentSimClip.frames.length > 0) {
        frameAccumulator += dt;
        const fps = currentSimClip.frameRate || 8;
        const fDuration = 1.0 / fps;
        
        if (frameAccumulator >= fDuration) {
          frameAccumulator -= fDuration;
          setPlaybackFrame((prevIdx) => (prevIdx + 1) % currentSimClip.frames.length);
        }
      }

      animFrameId = requestAnimationFrame(physicsLoop);
    };

    animFrameId = requestAnimationFrame(physicsLoop);

    const handleKeyDown = (e: KeyboardEvent) => {
      sandboxKeysRef.current[e.code] = true;
      // prevent browser space scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      sandboxKeysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSandboxMode, sandboxPhysicsStyle, sandboxVy, sandboxGrounded, animator, selectedAnimName]);

  // Frame Sprite Parser Helper
  const parsedPreviewFrame = useMemo(() => {
    if (!currentClip || currentClip.frames.length === 0) return null;
    const fIdx = Math.min(playbackFrame, currentClip.frames.length - 1);
    const frame = currentClip.frames[fIdx];
    if (!frame) return null;

    // Check pattern imagePrefix_index
    const pngMatch = frame.spriteId && frame.spriteId.match(/^(.*\.png)_(\d+)$/);
    if (pngMatch) {
      const url = pngMatch[1];
      const index = parseInt(pngMatch[2], 10);
      let cols = 4;
      let fw = sliceW;
      let fh = sliceH;

      if (url.includes('characters/')) {
        fw = 16;
        fh = 28;
        cols = 4;
      } else if (url.includes('items/')) {
        fw = 16;
        fh = 16;
        cols = 5;
      }

      return {
        url,
        fx: (index % cols) * fw,
        fy: Math.floor(index / cols) * fh,
        fw,
        fh
      };
    }

    // Default coordinate parsing _col_row at the end
    const colRowMatch = frame.spriteId && frame.spriteId.match(/_(\d+)_(\d+)$/);
    if (colRowMatch) {
      const u = parseInt(colRowMatch[1], 10);
      const v = parseInt(colRowMatch[2], 10);
      return {
        assetId: activeSheetId,
        fx: u * sliceW,
        fy: v * sliceH,
        fw: sliceW,
        fh: sliceH
      };
    }

    // Fallback to numeric index
    const numericIndex = parseInt(frame.spriteId, 10);
    if (!isNaN(numericIndex)) {
      return {
        assetId: activeSheetId,
        fx: (numericIndex % 4) * sliceW,
        fy: Math.floor(numericIndex / 4) * sliceH,
        fw: sliceW,
        fh: sliceH
      };
    }

    // Direct image slice
    return {
      assetId: activeSheetId,
      fx: 0,
      fy: 0,
      fw: sliceW,
      fh: sliceH
    };
  }, [currentClip, playbackFrame, activeSheetId, sliceW, sliceH]);

  // Attach a hardware Animator component to selected entity
  const handleAttachAnimator = () => {
    if (!engine || selectedEntityId === null) return;
    const initialAnim = createAnimator();
    // Pre-build basic idle, walk template clips
    initialAnim.animations['idle_down'] = {
      name: 'idle_down',
      frames: [{ spriteId: `${activeSheetId}_0` }],
      loop: true,
      frameRate: 6,
    };
    initialAnim.animations['walk_down'] = {
      name: 'walk_down',
      frames: [
        { spriteId: `${activeSheetId}_0` },
        { spriteId: `${activeSheetId}_1` },
        { spriteId: `${activeSheetId}_2` },
        { spriteId: `${activeSheetId}_3` }
      ],
      loop: true,
      frameRate: 8,
    };
    initialAnim.currentAnimation = 'idle_down';

    engine.world.addComponent(selectedEntityId, 'animator', initialAnim);
    
    // Set matching default sheet on entity's Sprite component to link values correctly!
    const sprite = engine.world.getComponent<Sprite>(selectedEntityId, 'sprite');
    if (sprite) {
      sprite.assetId = activeSheetId;
      sprite.frameWidth = sliceW;
      sprite.frameHeight = sliceH;
    }

    setSelectedAnimName('idle_down');
    setPlaybackFrame(0);
    forceUpdate();
    pushConsoleLog('success', 'ANIM_STUDIO', `Successfully attached specialized Animator component onto ${entityNames[selectedEntityId] || 'Entity'}`);
  };

  // Add a newly crafted Animation Clip
  const handleCreateNewClip = () => {
    if (!animator) return;
    const trimmed = newClipNameInput.trim().toLowerCase();
    if (!trimmed) return;

    if (animator.animations[trimmed]) {
      pushConsoleLog('warn', 'ANIM_STUDIO', `Clip "${trimmed}" already exists.`);
      return;
    }

    animator.animations[trimmed] = {
      name: trimmed,
      frames: [],
      loop: newClipLoopInput,
      frameRate: newClipFpsInput,
    };

    setSelectedAnimName(trimmed);
    setPlaybackFrame(0);
    setIsAddingClip(false);
    forceUpdate();
    pushConsoleLog('success', 'ANIM_STUDIO', `Created new blank clip "${trimmed}" @ ${newClipFpsInput} FPS`);
  };

  // Delete current Clip
  const handleDeleteClip = (clipName: string) => {
    if (!animator) return;
    
    delete animator.animations[clipName];
    const keys = Object.keys(animator.animations);
    const nextClip = keys[0] || '';
    
    setSelectedAnimName(nextClip);
    setPlaybackFrame(0);
    forceUpdate();
    pushConsoleLog('info', 'ANIM_STUDIO', `Deleted Animation Clip: ${clipName}`);
  };

  // Append clicked/selected sheet cell to active movie clip
  const handleAddFrameToTimeline = (u: number, v: number, bulkCount = 1) => {
    if (!animator || !currentClip) {
      pushConsoleLog('warn', 'ANIM_STUDIO', `Cannot insert frame: Please select or attach an Animator clip first.`);
      return;
    }

    const uniqueId = `${activeSheetId}_${u}_${v}`;

    if (bulkCount > 1) {
      // Create horizontal frame strip starting from selected cell
      for (let i = 0; i < bulkCount; i++) {
        const stepU = u + i;
        currentClip.frames.push({ spriteId: `${activeSheetId}_${stepU}_${v}` });
      }
      pushConsoleLog('success', 'ANIM_STUDIO', `Imported sequential strip of ${bulkCount} frames starting from cell (${u}, ${v})`);
    } else {
      currentClip.frames.push({ spriteId: uniqueId });
      pushConsoleLog('success', 'ANIM_STUDIO', `Appended frame cell (${u}, ${v}) onto timeline`);
    }

    // Update real-time component size settings to map coordinates properly
    const sprite = engine?.world.getComponent<Sprite>(selectedEntityId!, 'sprite');
    if (sprite) {
      sprite.assetId = activeSheetId;
      sprite.frameWidth = sliceW;
      sprite.frameHeight = sliceH;
    }

    setSelectedTimelineFrameIdx(currentClip.frames.length - 1);
    forceUpdate();
  };

  // Auto Cardinal Generator for active spritesheet
  const handleAutoGenerateCardinalClips = () => {
    if (!animator) return;

    // Generate walk cycles based on standard 4-row ninja spritesheets:
    // Row 0 = walk down, Row 1 = walk left, Row 2 = walk right, Row 3 = walk up
    const walkCyclesDefinition = [
      { name: 'walk_down', row: 0, count: 4 },
      { name: 'walk_left', row: 1, count: 4 },
      { name: 'walk_right', row: 2, count: 4 },
      { name: 'walk_up', row: 3, count: 4 },
      { name: 'idle_down', row: 0, count: 1 }
    ];

    walkCyclesDefinition.forEach(cycle => {
      const frames = [];
      for (let i = 0; i < cycle.count; i++) {
        frames.push({ spriteId: `${activeSheetId}_${i}_${cycle.row}` });
      }
      animator.animations[cycle.name] = {
        name: cycle.name,
        frames,
        loop: cycle.count > 1,
        frameRate: 8
      };
    });

    // Update corresponding Sprite sizes to link
    const sprite = engine?.world.getComponent<Sprite>(selectedEntityId!, 'sprite');
    if (sprite) {
      sprite.assetId = activeSheetId;
      sprite.frameWidth = sliceW;
      sprite.frameHeight = sliceH;
    }

    setSelectedAnimName('walk_down');
    setPlaybackFrame(0);
    forceUpdate();
    pushConsoleLog('success', 'ANIM_STUDIO', `Generated 5-Cardinal Gamepad Movements from standard 16-bit tileset.`);
  };

  // Timeline operations
  const handleMoveFrameLeft = (idx: number) => {
    if (!currentClip || idx === 0) return;
    const frames = [...currentClip.frames];
    const temp = frames[idx];
    frames[idx] = frames[idx - 1];
    frames[idx - 1] = temp;
    currentClip.frames = frames;
    setSelectedTimelineFrameIdx(idx - 1);
    forceUpdate();
  };

  const handleMoveFrameRight = (idx: number) => {
    if (!currentClip || idx === currentClip.frames.length - 1) return;
    const frames = [...currentClip.frames];
    const temp = frames[idx];
    frames[idx] = frames[idx + 1];
    frames[idx + 1] = temp;
    currentClip.frames = frames;
    setSelectedTimelineFrameIdx(idx + 1);
    forceUpdate();
  };

  const handleDuplicateFrame = (idx: number) => {
    if (!currentClip) return;
    const duplicate = { ...currentClip.frames[idx] };
    currentClip.frames.splice(idx + 1, 0, duplicate);
    setSelectedTimelineFrameIdx(idx + 1);
    forceUpdate();
    pushConsoleLog('info', 'ANIM_STUDIO', `Duplicated frame block #${idx}`);
  };

  const handleDeleteFrame = (idx: number) => {
    if (!currentClip) return;
    currentClip.frames.splice(idx, 1);
    setSelectedTimelineFrameIdx(currentClip.frames.length > 0 ? Math.max(0, idx - 1) : null);
    forceUpdate();
    pushConsoleLog('info', 'ANIM_STUDIO', `Removed frame block #${idx} from timeline`);
  };

  const handleTimelineFrameClick = (idx: number) => {
    setSelectedTimelineFrameIdx(idx);
    setPlaybackFrame(idx); // snap playback preview also for granular tuning!
    setIsPlaying(false); // pause to focus on cell
  };

  return (
    <div className="flex h-full flex-col bg-neutral-900 font-sans text-neutral-200 select-none overflow-hidden">
      
      {/* Top Banner Header */}
      <div className="h-10 border-b border-stone-850 bg-neutral-950 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1 px-1.5 rounded bg-pink-905/10 border border-pink-505/25 text-pink-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono tracking-widest font-extrabold uppercase">Animation Studio Pro</span>
          </div>
          <span className="text-stone-500 font-mono text-[10px]">/ Sprite-to-Physics Rigging Suite</span>
        </div>

        {/* Selected Entity Context Status */}
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-stone-900 border border-stone-800">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-stone-400">Target Entity:</span>
            {selectedEntityId !== null ? (
              <span className="text-green-400 font-semibold">{entityNames[selectedEntityId] || `ID ${selectedEntityId}`}</span>
            ) : (
              <span className="text-rose-400 font-semibold">None Selected</span>
            )}
          </div>
          {animator && (
            <span className="bg-neutral-800 text-stone-300 font-bold px-2 py-0.5 rounded border border-neutral-700">
              ⚡ ACTIVE RUNNER
            </span>
          )}
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* 1. LEFT SIDEBAR: Clips list & global settings */}
        <div className="w-68 border-r border-stone-850 bg-neutral-950 flex flex-col shrink-0 min-h-0">
          
          {/* List Headers */}
          <div className="p-3 border-b border-stone-850 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-stone-400">Clips & Vectors</span>
            {animator && (
              <button 
                onClick={() => setIsAddingClip(true)}
                className="p-1 rounded bg-stone-900 hover:bg-pink-950/40 hover:text-pink-400 border border-stone-800 hover:border-pink-850 flex items-center justify-center transition-all cursor-pointer"
                title="Create New Blank Clip"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!animator ? (
            <div className="p-4 flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-stone-900/80 border border-stone-800 flex items-center justify-center text-stone-500">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-stone-300">No Animator Active</p>
                <p className="text-[10px] text-stone-500 leading-normal max-w-[170px] mx-auto">
                  Select a game entity in the hierarchy, then click below to bind an animation component.
                </p>
              </div>

              {selectedEntityId !== null ? (
                <button
                  onClick={handleAttachAnimator}
                  className="w-full max-w-[160px] py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-[10px] uppercase font-bold tracking-wider text-white shadow-lg shadow-indigo-950/20 flex items-center justify-center space-x-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Animator</span>
                </button>
              ) : (
                <p className="text-[9px] text-indigo-400/80 font-mono italic">
                  *Please click on an Entity first
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Creator Mode Popover modal */}
              {isAddingClip && (
                <div className="p-3 bg-neutral-900 border-b border-stone-850 space-y-3">
                  <span className="text-[10px] font-bold uppercase text-indigo-405 tracking-wider">New Clip Parameters</span>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-stone-500 block mb-0.5">Name</label>
                      <input 
                        type="text"
                        value={newClipNameInput}
                        onChange={(e) => setNewClipNameInput(e.target.value)}
                        className="w-full bg-neutral-950 border border-stone-800 rounded px-2 py-1 text-xs font-mono text-neutral-250 outline-none focus:border-stone-700"
                        placeholder="e.g. walk_down"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-stone-500 block mb-0.5">Base FPS</label>
                        <input 
                          type="number"
                          min="1" max="60"
                          value={newClipFpsInput}
                          onChange={(e) => setNewClipFpsInput(parseInt(e.target.value) || 8)}
                          className="w-full bg-neutral-950 border border-stone-800 rounded px-2 py-1 text-xs font-mono text-neutral-250 outline-none focus:border-stone-700"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center space-x-2 text-[10px] text-stone-400 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={newClipLoopInput}
                            onChange={(e) => setNewClipLoopInput(e.target.checked)}
                            className="rounded border-stone-800 bg-neutral-950 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span>Loop Play</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-1 text-[10px]">
                      <button 
                        onClick={handleCreateNewClip}
                        className="flex-1 py-1 rounded bg-indigo-605 text-white font-bold text-center cursor-pointer hover:bg-indigo-500"
                      >
                        Create
                      </button>
                      <button 
                        onClick={() => setIsAddingClip(false)}
                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-center cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Clip selector rows */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {Object.keys(animator.animations).map((clipKey) => {
                  const clip = animator.animations[clipKey];
                  const isSelected = selectedAnimName === clipKey;
                  return (
                    <div 
                      key={clipKey}
                      onClick={() => {
                        setSelectedAnimName(clipKey);
                        setPlaybackFrame(0);
                        setSelectedTimelineFrameIdx(0);
                      }}
                      className={`group flex items-center justify-between p-2 rounded border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-950/20 border-indigo-505 shadow-[inner_0_0_10px_rgba(99,102,241,0.1)] text-indigo-200' 
                          : 'bg-stone-900/40 border-stone-850 hover:bg-stone-900 hover:border-stone-750 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-pink-400 animate-pulse' : 'bg-stone-600'}`} />
                        <div className="truncate font-mono text-xs font-semibold">{clip.name}</div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 opacity-80 group-hover:opacity-100">
                        <span className="text-[9px] font-mono text-stone-500 bg-black/40 px-1 py-0.5 rounded border border-stone-800">
                          {clip.frames.length} f
                        </span>
                        <span className="text-[9px] font-mono text-stone-500 bg-black/40 px-1 py-0.5 rounded border border-stone-800">
                          {clip.frameRate} fps
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClip(clipKey);
                          }}
                          className="p-1 rounded text-stone-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
                          title="Delete Clip"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bulk Generation Fast Options */}
              <div className="p-3 bg-stone-950/70 border-t border-stone-850 space-y-3">
                <span className="text-[10px] font-bold uppercase text-stone-500 tracking-wider block">Bulk Utilities</span>
                <button
                  onClick={handleAutoGenerateCardinalClips}
                  className="w-full py-1.5 px-2 bg-stone-900 border border-stone-800 hover:border-pink-505/30 rounded text-[10px] uppercase font-bold tracking-wider text-pink-400 hover:text-pink-300 text-center transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Gen Cardinal Movs</span>
                </button>
                <span className="text-[9px] text-stone-600 block leading-normal text-center">
                  *Auto-creates walk_down, walk_up, walk_left, walk_right cycles from active character row offsets.
                </span>
              </div>

              {/* Clip configurations */}
              {currentClip && (
                <div className="p-3 bg-neutral-900 border-t border-stone-850 space-y-3 shrink-0">
                  <div className="flex items-center space-x-1">
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Clip Settings</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-black/30 p-1.5 rounded border border-stone-850">
                      <span className="text-stone-400 text-[10px] uppercase">Loop Animation</span>
                      <input 
                        type="checkbox"
                        checked={currentClip.loop}
                        onChange={(e) => {
                          currentClip.loop = e.target.checked;
                          forceUpdate();
                        }}
                        className="rounded border-stone-800 bg-neutral-950 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                    </div>
                    
                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between text-[10px] text-stone-400">
                        <span>FRAMERATE (FPS)</span>
                        <span className="text-green-400 font-bold">{currentClip.frameRate} Hz</span>
                      </div>
                      <input 
                        type="range"
                        min="1" max="30"
                        value={currentClip.frameRate}
                        onChange={(e) => {
                          currentClip.frameRate = parseInt(e.target.value) || 8;
                          forceUpdate();
                        }}
                        className="w-full accent-indigo-505 h-1 bg-stone-900 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. CENTER PANEL: Visual Slicing & Grid Matrix (Splicer Workspace) */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-stone-850">
          
          {/* Splicer Header options */}
          <div className="h-10 border-b border-stone-850 bg-stone-950 px-3 flex items-center justify-between shrink-0 font-mono">
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Spritesheet:</span>
              <select
                value={activeSheetId}
                onChange={(e) => setActiveSheetId(e.target.value)}
                className="bg-neutral-900 border border-stone-800 rounded px-2 py-0.5 text-xs text-stone-300 font-sans cursor-pointer focus:border-stone-700 outline-none"
              >
                {availableSheets.map(sheet => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name} (Category: {sheet.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Micro grid spacing setup selectors */}
            <div className="flex items-center space-x-4 text-[10px] uppercase">
              <div className="flex items-center space-x-1.5">
                <span className="text-stone-500">Cell:</span>
                <input 
                  type="number" 
                  value={sliceW} 
                  onChange={(e) => setSliceW(Math.max(4, parseInt(e.target.value) || 16))}
                  className="w-10 bg-neutral-900 border border-stone-800 rounded text-center px-1 py-0.5 text-stone-200" 
                />
                <span className="text-stone-500">x</span>
                <input 
                  type="number" 
                  value={sliceH} 
                  onChange={(e) => setSliceH(Math.max(4, parseInt(e.target.value) || 28))}
                  className="w-10 bg-neutral-900 border border-stone-800 rounded text-center px-1 py-0.5 text-stone-200" 
                />
              </div>

              {/* Grid zoom sliders */}
              <div className="flex items-center space-x-1 border-stone-800 pl-2">
                <button 
                  onClick={() => setSheetZoom(z => Math.max(1, z - 1))}
                  className="p-1 hover:bg-stone-900 rounded text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                  title="Zoom Out Matrix"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-stone-400 font-mono text-[9px] w-8 text-center">{sheetZoom}x</span>
                <button 
                  onClick={() => setSheetZoom(z => Math.min(8, z + 1))}
                  className="p-1 hover:bg-stone-900 rounded text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                  title="Zoom In Matrix"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrolling Sprite Slicing Workspace Grid view */}
          <div className="flex-1 overflow-auto bg-stone-950 p-6 flex items-center justify-center relative relative-custom-grid selection-none">
            <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-stone-500 uppercase flex items-center space-x-1 bg-black/40 p-1 rounded border border-stone-850">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Slices Matrix Navigation</span>
            </div>

            {/* Zoom bounds container wrapper */}
            <div className="relative border border-stone-880 rounded-lg overflow-hidden bg-black/30 shadow-2xl">
              
              {/* Overlay Interactive grid lines rendering mapped to slice width and height */}
              <img 
                src={engine?.assets?.getAssetUrl(activeSheetId || '') || ''}
                alt="sheet picker"
                className="block select-none pointer-events-none"
                style={{
                  width: 'auto',
                  height: 'auto',
                  zoom: sheetZoom,
                  imageRendering: 'pixelated'
                }}
                referrerPolicy="no-referrer"
              />

              {/* Slicing grid overlay absolute overlay */}
              <div 
                className="absolute inset-0 cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / sheetZoom;
                  const y = (e.clientY - rect.top) / sheetZoom;
                  const u = Math.floor(x / sliceW);
                  const v = Math.floor(y / sliceH);
                  if (u >= 0 && v >= 0) {
                    setSelectedCell({ u, v });
                  }
                }}
              >
                {/* Visual grid outlines */}
                {Array.from({ length: 48 }).map((_, v) => (
                  <div 
                    key={`row-${v}`} 
                    className="absolute left-0 right-0 border-b border-white/[0.045] pointer-events-none" 
                    style={{ top: `${v * sliceH * sheetZoom}px` }} 
                  />
                ))}
                {Array.from({ length: 48 }).map((_, u) => (
                  <div 
                    key={`col-${u}`} 
                    className="absolute top-0 bottom-0 border-r border-white/[0.045] pointer-events-none" 
                    style={{ left: `${u * sliceW * sheetZoom}px` }} 
                  />
                ))}

                {/* Draw glowing hover border index cell */}
                {/* Render active selected cell frame overlay */}
                {selectedCell && (
                  <div 
                    className="absolute border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.5)] pointer-events-none transition-all duration-75"
                    style={{
                      left: `${selectedCell.u * sliceW * sheetZoom}px`,
                      top: `${selectedCell.v * sliceH * sheetZoom}px`,
                      width: `${sliceW * sheetZoom}px`,
                      height: `${sliceH * sheetZoom}px`
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Splicer apply action workspace instructions block */}
          {currentClip && selectedCell && (
            <div className="p-3 bg-neutral-900 border-t border-stone-850 flex items-center justify-between shrink-0 font-mono text-xs">
              <div className="flex items-center space-x-2 text-stone-400">
                <span className="text-amber-400 font-bold">Selected Cell:</span>
                <span>Column {selectedCell.u} | Row {selectedCell.v}</span>
                <span className="text-stone-600 bg-black/30 p-1 px-1.5 rounded border border-stone-850">
                  {sliceW}x{sliceH}px
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Instant Replace current selected frame */}
                {selectedTimelineFrameIdx !== null && currentClip.frames[selectedTimelineFrameIdx] && (
                  <button
                    onClick={() => {
                      const frames = [...currentClip.frames];
                      frames[selectedTimelineFrameIdx] = { spriteId: `${activeSheetId}_${selectedCell.u}_${selectedCell.v}` };
                      currentClip.frames = frames;
                      forceUpdate();
                      pushConsoleLog('success', 'ANIM_STUDIO', `Updated keyframe block #${selectedTimelineFrameIdx} coordinates to (${selectedCell.u}, ${selectedCell.v})`);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all cursor-pointer"
                  >
                    Replace frame #{selectedTimelineFrameIdx}
                  </button>
                )}

                {/* Main Insert action */}
                <button
                  onClick={() => handleAddFrameToTimeline(selectedCell.u, selectedCell.v, 1)}
                  className="px-3 py-1 font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center space-x-1 uppercase text-[11px] tracking-wider transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert frame</span>
                </button>

                {/* Import Row Sequence helper clicker */}
                <button
                  onClick={() => handleAddFrameToTimeline(selectedCell.u, selectedCell.v, 4)}
                  className="px-3 py-1 font-bold rounded bg-neutral-800 border border-stone-750 hover:bg-neutral-750 text-stone-200 text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                  title="Imports next 4 sequential tiles in row instantly as frames"
                >
                  <span>Import Strip (Rowx4)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. RIGHT PANEL: Live preview, themed backdrop and Sandbox Joypad */}
        <div className="w-80 bg-neutral-950 flex flex-col shrink-0 min-h-0">
          
          <div className="h-10 border-b border-stone-850 p-2.5 flex items-center justify-between shrink-0 font-mono text-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">Ticking Preview Canvas</span>
            
            {/* Zoom slider control previews */}
            <div className="flex items-center space-x-1.5 border-stone-800">
              <button 
                onClick={() => setPreviewZoom(z => Math.max(2, z - 1))}
                className="p-0.5 hover:bg-stone-900 rounded text-stone-400 hover:text-stone-100 cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-stone-500 font-mono text-[9px]">{previewZoom}x</span>
              <button 
                onClick={() => setPreviewZoom(z => Math.min(14, z + 1))}
                className="p-0.5 hover:bg-stone-900 rounded text-stone-400 hover:text-stone-100 cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Main Simulated Preview stage area */}
          <div 
            ref={sandboxRef}
            tabIndex={0}
            className="h-56 relative overflow-hidden flex items-center justify-center transition-all outline-none focus:ring-1 focus:ring-indigo-500"
            style={BACKDROP_STYLES[backdropTheme]}
          >
            {/* Show outline when in sandbox mode focusing keys */}
            {isSandboxMode && (
              <div className="absolute inset-0 pointer-events-none border border-pink-500/40 animate-pulse bg-pink-500/5 flex flex-col justify-between p-2">
                <div className="flex items-center justify-between text-[8px] font-mono font-bold text-pink-400 tracking-wider">
                  <span>● JOYPAD SANDBOX CAPTURE</span>
                  <span>WASD / ARROWS MOVEMENT</span>
                </div>
                <div className="flex items-center justify-between text-[8px] text-pink-500">
                  <span>{sandboxPhysicsStyle === 'platformer' ? 'SPACEBAR = JUMP' : 'TOP-DOWN AXIS'}</span>
                  <span>POS: {sandboxPos.x.toFixed(0)}, {sandboxPos.y.toFixed(0)}</span>
                </div>
              </div>
            )}

            {/* Subtle retro horizontal scan lines override effect */}
            <div className="absolute inset-0 pointer-events-none mix-blend-overlay bg-gradient-to-b from-white/[0.035] to-black/[0.04] bg-[length:100%_4px]" />

            {/* Pivot/Ground visual helpers */}
            {showHelperGrid && !isSandboxMode && (
              <div className="absolute pointer-events-none border-t border-neutral-700/45 w-1/2 h-0" />
            )}
            {showHelperGrid && !isSandboxMode && (
              <div className="absolute pointer-events-none border-l border-neutral-700/45 h-1/2 w-0" />
            )}

            {/* Dynamic Sliced Pixel rendering of active ticker frame */}
            {parsedPreviewFrame ? (
              <div 
                className="absolute transition-transform duration-75"
                style={{
                  transform: isSandboxMode 
                    ? `translate(${sandboxPos.x}px, ${sandboxPos.y - 12}px)` // Physics simulated coords
                    : 'none'
                }}
              >
                <PixelFramePreview
                  assetId={parsedPreviewFrame.assetId || activeSheetId} engine={engine}
                  fx={parsedPreviewFrame.fx}
                  fy={parsedPreviewFrame.fy}
                  fw={parsedPreviewFrame.fw}
                  fh={parsedPreviewFrame.fh}
                  zoom={previewZoom}
                  flipX={isSandboxMode ? sandboxFacingRight : false}
                />
              </div>
            ) : (
              <div className="text-center font-mono text-[10px] text-stone-500 space-y-1">
                <p>Blank Loop</p>
                <p className="text-[9px] text-stone-600 font-sans mt-1">Insert sprites from the center grid to generate cycles</p>
              </div>
            )}

            {/* Active Framerate floating label */}
            {currentClip && (
              <div className="absolute bottom-2 left-2 pointer-events-none text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded text-indigo-400 border border-stone-850">
                CLIP FRAME: {playbackFrame + 1} / {currentClip.frames.length}
              </div>
            )}
          </div>

          {/* Tape-deck Playback Control Board */}
          <div className="p-3 bg-neutral-900 border-b border-stone-850 flex items-center justify-between shrink-0 font-mono text-xs">
            <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded border border-stone-800">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackFrame(0);
                }}
                className="p-1 rounded text-stone-400 hover:text-stone-200 cursor-pointer"
                title="Stop & Reset Frame Index to 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-1 rounded transition-colors cursor-pointer ${isPlaying ? 'bg-indigo-600 text-white' : 'text-stone-400 hover:text-stone-150'}`}
                title={isPlaying ? 'Pause Loop' : 'Play Loop'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Playback speed chooser */}
            <div className="flex items-center space-x-1 text-[9px] bg-sky-950/15 border border-sky-901/10 p-1 py-0.5 rounded text-sky-400">
              <span className="font-bold">SPEED:</span>
              <select
                value={playbackMultiplier}
                onChange={(e) => setPlaybackMultiplier(parseFloat(e.target.value))}
                className="bg-transparent text-sky-300 font-bold focus:outline-none pointer-events-auto cursor-pointer"
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
            </div>
          </div>

          {/* Backdrop themes selector carousel */}
          <div className="p-3 bg-stone-950/60 border-b border-stone-850 flex items-center justify-between text-[10px] uppercase">
            <span className="text-stone-500 font-mono">BACKDROP:</span>
            <div className="flex bg-stone-900 border border-stone-800 p-0.5 rounded overflow-hidden">
              {(['synthwave', 'grid', 'meadow', 'void', 'magma'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setBackdropTheme(style)}
                  className={`px-1.5 py-0.5 rounded-sm capitalize text-[9px] font-semibold transition-all cursor-pointer ${
                    backdropTheme === style ? 'bg-indigo-650/30 text-indigo-305 font-bold border border-indigo-900' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Joystick Playtest Sandbox Setup Controller */}
          {animator && (
            <div className="flex-1 p-3 flex flex-col justify-between overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <Gamepad2 className="w-4 h-4 text-pink-400" />
                    <span className="tracking-wide uppercase text-neutral-250">Joystick playtester</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsSandboxMode(!isSandboxMode);
                      if (!isSandboxMode) {
                        setSandboxPos({ x: 0, y: 70 });
                        setIsPlaying(false);
                        pushConsoleLog('info', 'ANIM_STUDIO', 'Joystick mode activated. Focus preview and use WASD/Arrows to simulated character movement!');
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono text-[9px] border transition-all cursor-pointer ${
                      isSandboxMode 
                        ? 'bg-pink-600 hover:bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-900/30' 
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border-stone-850'
                    }`}
                  >
                    {isSandboxMode ? 'PLAYTESTING' : 'SANDBOX MODE'}
                  </button>
                </div>

                {isSandboxMode && (
                  <div className="p-2 rounded bg-stone-950/80 border border-stone-850 space-y-2.5">
                    {/* Sandbox type select */}
                    <div className="flex items-center justify-between text-[10px] py-1 border-b border-stone-850">
                      <span className="text-stone-400 font-mono">PHYSICS TYPE:</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setSandboxPhysicsStyle('topdown')}
                          className={`px-1.5 py-0.5 rounded font-mono text-[9px] cursor-pointer ${sandboxPhysicsStyle === 'topdown' ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-stone-500'}`}
                        >
                          TOPDOWN
                        </button>
                        <button
                          onClick={() => setSandboxPhysicsStyle('platformer')}
                          className={`px-1.5 py-0.5 rounded font-mono text-[9px] cursor-pointer ${sandboxPhysicsStyle === 'platformer' ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-stone-500'}`}
                        >
                          SIDESCROLLER
                        </button>
                      </div>
                    </div>

                    <div className="text-[9px] text-stone-500 leading-normal space-y-1 font-mono">
                      <p>🎮 Keyboard Movement Active:</p>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        <li>WASD or Arrow Keys to Move</li>
                        {sandboxPhysicsStyle === 'platformer' && <li>SPACEBAR to Jump</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {!isSandboxMode && (
                <div className="p-2 rounded bg-stone-900/10 border border-stone-850 text-[10px] text-stone-600 leading-normal mb-1 font-mono">
                  💡 Tip: Turn on "Sandbox Mode" to run and jump your animated character on the active backdrop, previewing in-game response rates and transitions!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM PANEL: Cinematic keyframe filmstrip timeline */}
      <div className="h-44 border-t border-stone-850 bg-neutral-950 flex flex-col shrink-0 min-h-0">
        
        {/* Timeline Header Row */}
        <div className="h-8 px-3 border-b border-stone-880 bg-stone-950 flex items-center justify-between shrink-0 text-xs">
          <span className="font-extrabold uppercase tracking-widest text-stone-400 flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span>Cinematic Keyframes Filmstrip Timeline</span>
          </span>

          {currentClip && (
            <div className="flex items-center space-x-2 font-mono text-[10px]">
              <span className="text-stone-500 uppercase">CLIP FRAME COUNT:</span>
              <span className="text-green-400 font-bold bg-green-955/35 px-1.5 border border-green-901/10 rounded">
                {currentClip.frames.length} Total Frames
              </span>
            </div>
          )}
        </div>

        {/* Cinematic filmstrip scrolling viewport */}
        <div className="flex-1 overflow-x-auto custom-scrollbar bg-neutral-950 font-mono text-[10px] flex items-center px-4 space-x-3.5">
          {!currentClip ? (
            <div className="w-full text-center text-stone-600 italic py-6">
              *Please select a Clip or create one on the left panel to insert keyframe slices
            </div>
          ) : currentClip.frames.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center space-y-2 py-4">
              <div className="text-stone-500 italic text-[11px] text-center">
                Timeline Empty. Click on cells in the center Slices Matrix to append frames here!
              </div>
              <div className="text-[9px] text-indigo-400 px-3 py-1 bg-indigo-950/20 rounded border border-indigo-900/10 animate-pulse">
                💡 CLICK A GRID SQUARE → CLICK "INSERT FRAME" TO START DESIGNING ACTIONS
              </div>
            </div>
          ) : (
            currentClip.frames.map((frame, i) => {
              const isActivePlaying = playbackFrame === i;
              const isSelected = selectedTimelineFrameIdx === i;

              // Parse image coordinates for miniature preview thumbnail
              const fData = (() => {
                const pngMatch = frame.spriteId && frame.spriteId.match(/^(.*\.png)_(\d+)$/);
                if (pngMatch) {
                  const url = pngMatch[1];
                  const idx = parseInt(pngMatch[2], 10);
                  let cols = 4;
                  let fw = sliceW;
                  let fh = sliceH;

                  if (url.includes('characters/')) {
                    fw = 16;
                    fh = 28;
                    cols = 4;
                  } else if (url.includes('items/')) {
                    fw = 16;
                    fh = 16;
                    cols = 5;
                  }

                  return {
                    assetId: url,
                    fx: (idx % cols) * fw,
                    fy: Math.floor(idx / cols) * fh,
                    fw,
                    fh
                  };
                }

                const colRowMatched = frame.spriteId && frame.spriteId.match(/_(\d+)_(\d+)$/);
                if (colRowMatched) {
                  return {
                    assetId: activeSheetId,
                    fx: parseInt(colRowMatched[1], 10) * sliceW,
                    fy: parseInt(colRowMatched[2], 10) * sliceH,
                    fw: sliceW,
                    fh: sliceH
                  };
                }

                // Fallback numeric index
                const num = parseInt(frame.spriteId, 10);
                if (!isNaN(num)) {
                  return {
                    assetId: activeSheetId,
                    fx: (num % 4) * sliceW,
                    fy: Math.floor(num / 4) * sliceH,
                    fw: sliceW,
                    fh: sliceH
                  };
                }

                return { assetId: activeSheetId, fx: 0, fy: 0, fw: sliceW, fh: sliceH };
              })();

              return (
                <div 
                  key={`frame-${i}`}
                  onClick={() => handleTimelineFrameClick(i)}
                  className={`relative flex flex-col items-center shrink-0 w-28 group rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-950 border-indigo-505 shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
                      : isActivePlaying
                        ? 'bg-stone-900 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                        : 'bg-stone-905/70 border-stone-850 hover:border-stone-700'
                  }`}
                >
                  {/* Floating Frame Count Tag overlay */}
                  <div className={`absolute top-1.5 left-1.5 font-sans font-extrabold text-[9px] px-1 rounded block ${
                    isSelected ? 'bg-indigo-600 text-white' : isActivePlaying ? 'bg-green-600 text-white' : 'bg-neutral-800 text-stone-400'
                  }`}>
                    #{i + 1}
                  </div>

                  {/* Frame Action Controls overlay appearing on hover */}
                  <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveFrameLeft(i);
                      }}
                      disabled={i === 0}
                      className="p-0.5 rounded bg-black/60 hover:bg-black text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Keyframe Left"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveFrameRight(i);
                      }}
                      disabled={i === currentClip.frames.length - 1}
                      className="p-0.5 rounded bg-black/60 hover:bg-black text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Keyframe Right"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateFrame(i);
                      }}
                      className="p-0.5 rounded bg-black/60 hover:bg-black text-stone-400 hover:text-cyan-400 cursor-pointer"
                      title="Duplicate Keyframe Block"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFrame(i);
                      }}
                      className="p-0.5 rounded bg-black/60 hover:bg-red-950 text-stone-400 hover:text-rose-400 cursor-pointer"
                      title="Delete Keyframe"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Cropped Miniature graphic preview of this framerate index */}
                  <div className="py-2.5 pt-6 select-none flex items-center justify-center min-h-[60px]">
                    <PixelFramePreview
                      assetId={fData.assetId || activeSheetId} engine={engine}
                      fx={fData.fx}
                      fy={fData.fy}
                      fw={fData.fw}
                      fh={fData.fh}
                      zoom={2}
                      className="border-neutral-900"
                    />
                  </div>

                  {/* Coordinate tag labels */}
                  <div className="w-full border-t border-stone-850 p-1 text-center truncate text-[8px] text-stone-400 bg-neutral-950 font-sans tracking-tight">
                    {frame.spriteId ? (
                      (() => {
                        const parsedName = frame.spriteId.substring(frame.spriteId.lastIndexOf('/') + 1);
                        return parsedName || 'unnamed';
                      })()
                    ) : (
                      'col: 0, row: 0'
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
