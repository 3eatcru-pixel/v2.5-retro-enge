import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  RefreshCw, 
  Layers, 
  Activity, 
  Gauge, 
  FolderPlus, 
  Film 
} from 'lucide-react';
import { useEditorStore } from '../../state/editor.store';
import { useEngineStore } from '../../state/engine.store';
import { Animator, AnimationClip } from '../../core/ecs/components/Animator';
import { Sprite } from '../../core/ecs/components/Sprite';
import { ModifyComponentCommand } from '../../core/command-system/commands/ModifyComponentCommand';

export function AnimationInspector() {
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const forceUpdate = useEditorStore((s) => s.forceUpdate);
  const engine = useEngineStore((s) => s.engine);

  const [activeTab, setActiveTab] = useState<'clips' | 'sequences'>('clips');
  const [newClipName, setNewClipName] = useState('');
  const [newClipFps, setNewClipFps] = useState(8);

  // Poll state to update current frame indicator while playing
  useEffect(() => {
    if (!engine || selectedEntityId === null) return;
    
    const interval = setInterval(() => {
      const animator = engine.world.getComponent<Animator>(selectedEntityId, 'animator');
      if (animator && animator.isPlaying) {
        // Force the react store update to trigger re-renders of the frame scrubber/index
        forceUpdate();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [engine, selectedEntityId, forceUpdate]);

  if (selectedEntityId === null || !engine) {
    return null;
  }

  const animator = engine.world.getComponent<Animator>(selectedEntityId, 'animator');
  const sprite = engine.world.getComponent<Sprite>(selectedEntityId, 'sprite');

  if (!animator) {
    return (
      <div className="bg-neutral-950 p-4 rounded-md border border-neutral-900 text-center text-neutral-500">
        <Film className="w-8 h-8 mx-auto mb-2 text-neutral-600 stroke-1" />
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Animation Inspector</p>
        <p className="text-[11px] text-neutral-500 max-w-xs mx-auto mb-3">
          Select an entity with an Animator component attached to inspect and control sequences.
        </p>
        <button
          onClick={() => {
            const initialData = {
              type: 'animator',
              animations: {
                idle: {
                  name: 'idle',
                  frames: [{ spriteId: '0_0' }, { spriteId: '1_0' }, { spriteId: '2_0' }, { spriteId: '3_0' }],
                  loop: true,
                  frameRate: 8
                }
              },
              currentAnimation: 'idle',
              frameIndex: 0,
              timer: 0,
              isPlaying: false,
              playbackRate: 1.0
            };
            engine.world.addComponent(selectedEntityId, 'animator', initialData as any);
            forceUpdate();
          }}
          className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded border border-indigo-500/30 text-xs font-medium transition-colors inline-flex items-center space-x-1.5"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Add Animator Component</span>
        </button>
      </div>
    );
  }

  const animClips = animator.animations || {};
  const clipKeys = Object.keys(animClips);
  const currentClipName = animator.currentAnimation || '';
  const currentClip: AnimationClip | null = currentClipName ? animClips[currentClipName] : null;
  const isPlaying = animator.isPlaying;
  const frameIndex = animator.frameIndex;
  const playbackRate = animator.playbackRate ?? 1.0;

  // Execute parameter patches
  const patchAnimator = (patch: Partial<Animator>) => {
    const command = new ModifyComponentCommand(engine, selectedEntityId, 'animator', patch);
    engine.commands.executeCommand(command);
    forceUpdate();
  };

  const patchCurrentClip = (patch: Partial<AnimationClip>) => {
    if (!currentClipName || !currentClip) return;
    const updatedClip = { ...currentClip, ...patch };
    const updatedAnimations = { ...animClips, [currentClipName]: updatedClip };
    patchAnimator({ animations: updatedAnimations });
  };

  const handlePlayToggle = () => {
    if (!currentClipName && clipKeys.length > 0) {
      // Pick first animation if none selected
      const first = clipKeys[0];
      patchAnimator({ currentAnimation: first, isPlaying: !isPlaying });
    } else {
      patchAnimator({ isPlaying: !isPlaying });
    }
  };

  const handleStop = () => {
    patchAnimator({ isPlaying: false, frameIndex: 0, timer: 0 });
    // Pull first frame coordinates onto sprite if possible
    if (sprite && currentClip && currentClip.frames.length > 0) {
      engine.animations.applyFrameToSprite(sprite, currentClip.frames[0].spriteId, currentClip);
    }
  };

  const handleFrameStep = (direction: 'forward' | 'backward') => {
    if (!currentClip || currentClip.frames.length === 0) return;
    const totalFrames = currentClip.frames.length;
    let nextIdx = frameIndex;

    if (direction === 'forward') {
      nextIdx = (frameIndex + 1) % totalFrames;
    } else {
      nextIdx = (frameIndex - 1 + totalFrames) % totalFrames;
    }

    patchAnimator({ isPlaying: false, frameIndex: nextIdx, timer: 0 });

    // Instantly update sprite rendering coordinates in editor
    const frame = currentClip.frames[nextIdx];
    if (sprite && frame) {
      engine.animations.applyFrameToSprite(sprite, frame.spriteId, currentClip);
    }
  };

  const handleScrub = (idx: number) => {
    if (!currentClip) return;
    const validIdx = Math.max(0, Math.min(idx, currentClip.frames.length - 1));
    patchAnimator({ frameIndex: validIdx, timer: 0 });
    
    // Instantly reflect scrub frames in renderer
    const frame = currentClip.frames[validIdx];
    if (sprite && frame) {
      engine.animations.applyFrameToSprite(sprite, frame.spriteId, currentClip);
    }
  };

  const handleAddClip = () => {
    if (!newClipName.trim()) return;
    const cleanName = newClipName.trim().toLowerCase();
    if (animClips[cleanName]) return; // Avoid overwrite collision

    const updatedClips = {
      ...animClips,
      [cleanName]: {
        name: cleanName,
        frames: [{ spriteId: '0_0' }],
        loop: true,
        frameRate: newClipFps
      }
    };

    patchAnimator({
      animations: updatedClips,
      currentAnimation: cleanName,
      frameIndex: 0,
      timer: 0
    });
    setNewClipName('');
  };

  const handleDeleteClip = (nameToDelete: string) => {
    const updatedClips = { ...animClips };
    delete updatedClips[nameToDelete];

    const fallbackClip = Object.keys(updatedClips)[0] || null;
    patchAnimator({
      animations: updatedClips,
      currentAnimation: fallbackClip,
      frameIndex: 0,
      timer: 0,
      isPlaying: isPlaying && fallbackClip !== null
    });
  };

  // Extract metadata attributes
  const totalFrames = currentClip ? currentClip.frames.length : 0;
  
  // Custom sliced cells if applicable
  const currentFrameId = currentClip && currentClip.frames[frameIndex] 
    ? currentClip.frames[frameIndex].spriteId 
    : 'None';

  return (
    <div id="animation-inspector-container" className="bg-neutral-950 rounded-lg border border-neutral-800 flex flex-col overflow-hidden text-neutral-200">
      
      {/* Header Tabs */}
      <div className="flex bg-neutral-900 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('clips')}
          className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase flex items-center space-x-1.5 border-b-2 transition-all ${
            activeTab === 'clips' 
              ? 'border-indigo-500 text-indigo-400 bg-neutral-950/40' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Local Clips</span>
        </button>
        <button
          onClick={() => setActiveTab('sequences')}
          className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase flex items-center space-x-1.5 border-b-2 transition-all ${
            activeTab === 'sequences' 
              ? 'border-indigo-500 text-indigo-400 bg-neutral-950/40' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Sheet Sequences</span>
        </button>
      </div>

      {activeTab === 'clips' ? (
        <div className="p-3.5 space-y-4">
          
          {/* Active Clip Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center justify-between">
              <span>Select Active Animation</span>
              {currentClip && (
                <span className="font-mono text-indigo-500 text-[9px] lowercase bg-indigo-500/10 px-1.5 rounded">
                  {currentClip.frames.length} frames
                </span>
              )}
            </label>
            <div className="flex space-x-2">
              <select
                value={currentClipName}
                onChange={(e) => patchAnimator({ currentAnimation: e.target.value || null, frameIndex: 0, timer: 0 })}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500 transition-colors capitalize font-medium"
              >
                <option value="">-- No Animation Selected --</option>
                {clipKeys.map((k) => (
                  <option key={k} value={k} className="bg-neutral-950 text-neutral-200">
                    {k}
                  </option>
                ))}
              </select>
              {currentClipName && (
                <button
                  onClick={() => handleDeleteClip(currentClipName)}
                  title="Remove Clip"
                  className="p-1 px-2.5 bg-rose-950/30 hover:bg-rose-600 text-rose-400 hover:text-white rounded border border-rose-900/50 transition-colors text-xs"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {currentClip ? (
            <>
              {/* Media Player Controls */}
              <div className="bg-neutral-900 rounded-lg p-3 border border-neutral-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-neutral-300 capitalize">{currentClipName}</span>
                    <span className="text-[9px] font-mono text-neutral-400">frame: {frameIndex + 1}/{totalFrames}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 flex items-center bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                    <Activity className="w-3 h-3 text-emerald-400 mr-1 animate-pulse" />
                    <span className="font-mono text-[9px] max-w-[120px] truncate">{currentFrameId}</span>
                  </div>
                </div>

                {/* Scrubber slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={totalFrames - 1}
                    value={frameIndex}
                    onChange={(e) => handleScrub(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    disabled={totalFrames <= 1}
                  />
                  <div className="flex justify-between text-[8px] font-mono text-neutral-500">
                    <span>Frame 0</span>
                    <span>Frame {totalFrames - 1}</span>
                  </div>
                </div>

                {/* Controls Bar */}
                <div className="flex justify-center items-center space-x-2 pt-1">
                  <button
                    onClick={() => handleFrameStep('backward')}
                    title="Step Backward"
                    className="p-1.5 bg-neutral-950 hover:bg-neutral-850 rounded border border-neutral-800 text-neutral-300 transition-colors"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handlePlayToggle}
                    title={isPlaying ? 'Pause' : 'Play'}
                    className={`p-2.5 rounded-full border transition-all ${
                      isPlaying 
                        ? 'bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600 hover:text-white' 
                        : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={handleStop}
                    title="Stop & Reset"
                    className="p-1.5 bg-neutral-950 hover:bg-neutral-850 rounded border border-neutral-800 text-neutral-300 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => handleFrameStep('forward')}
                    title="Step Forward"
                    className="p-1.5 bg-neutral-950 hover:bg-neutral-850 rounded border border-neutral-800 text-neutral-300 transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Loop and FrameRate settings */}
              <div className="grid grid-cols-2 gap-2.5">
                
                {/* Loop Setting Toggle */}
                <div className="bg-neutral-900 p-2.5 rounded border border-neutral-850 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Loop Animation</span>
                    <span className="text-[9px] text-neutral-500">Continuous repeat</span>
                  </div>
                  <button
                    onClick={() => patchCurrentClip({ loop: !currentClip.loop })}
                    className={`w-10 h-5.5 rounded-full relative transition-colors duration-200 outline-none border ${
                      currentClip.loop 
                        ? 'bg-indigo-600 border-indigo-500' 
                        : 'bg-neutral-850 border-neutral-750'
                    }`}
                  >
                    <span 
                      className={`block w-4 h-4 rounded-full bg-white transition-all shadow-md duration-200 absolute top-0.5 ${
                        currentClip.loop ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Clip FPS Customizer */}
                <div className="bg-neutral-900 p-2.5 rounded border border-neutral-850 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">FPS Speed</span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={currentClip.frameRate}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) patchCurrentClip({ frameRate: val });
                      }}
                      className="w-14 bg-neutral-950 border border-neutral-800 font-mono text-center text-xs text-neutral-200 rounded p-1 outline-none"
                    />
                    <span className="text-[9px] text-neutral-500">frames/sec</span>
                  </div>
                </div>

              </div>

              {/* Playback Speed Setting */}
              <div id="playback-speed-controls" className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-850 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Gauge className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Playback Speed</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">{playbackRate.toFixed(2)}x</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={0.1}
                    max={4.0}
                    step={0.05}
                    value={playbackRate}
                    onChange={(e) => patchAnimator({ playbackRate: parseFloat(e.target.value) })}
                    className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex space-x-1">
                    {[0.5, 1.0, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => patchAnimator({ playbackRate: rate })}
                        className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                          playbackRate === rate 
                            ? 'bg-indigo-600 text-white border-indigo-500' 
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        {rate.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Film Strip View of frames */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 tracking-wider flex items-center space-x-1">
                  <Film className="w-3 h-3 text-neutral-500" />
                  <span>Timeline Frames Strip</span>
                </span>
                <div className="flex space-x-1.5 overflow-x-auto pb-2 custom-scrollbar max-w-full">
                  {currentClip.frames.map((frame, idx) => {
                    const isActive = idx === frameIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleScrub(idx)}
                        className={`flex-none w-14 h-14 bg-neutral-900 rounded-md border flex flex-col justify-between p-1 text-left relative overflow-hidden transition-all group ${
                          isActive 
                            ? 'border-indigo-500 bg-indigo-500/10' 
                            : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                        }`}
                      >
                        <span className="text-[8px] font-mono text-neutral-500">#{idx}</span>
                        {/* Frame ID indicator */}
                        <span className="text-[8px] font-mono text-neutral-300 truncate w-full tracking-tighter">
                          {frame.spriteId}
                        </span>
                        
                        {/* Selector indicator */}
                        {isActive && (
                          <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-bl-sm flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </>
          ) : (
            <div className="py-8 text-center text-neutral-500 text-xs">
              No active animation is selected. Select an animation from the dropdown above or create a new one below.
            </div>
          )}

          {/* Quick Create Clip Block */}
          <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-850 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1">
              <FolderPlus className="w-3.5 h-3.5 text-neutral-500" />
              <span>Create New Animation Clip</span>
            </span>
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="e.g. walk_down"
                value={newClipName}
                onChange={(e) => setNewClipName(e.target.value)}
                className="w-full text-xs font-mono bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-200 outline-none focus:border-indigo-500/60"
              />
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  placeholder="FPS"
                  value={newClipFps}
                  onChange={(e) => setNewClipFps(Math.max(1, parseInt(e.target.value, 10)))}
                  className="w-16 text-xs text-center font-mono bg-neutral-950 border border-neutral-800 rounded p-1 text-neutral-200 outline-none"
                />
                <span className="text-[10px] text-neutral-500 mr-2">Default FPS</span>
                
                <button
                  onClick={handleAddClip}
                  className="flex-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded py-1 px-3 text-xs font-medium transition-colors"
                >
                  Create Clip
                </button>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Sheet sequences Tab */
        <div className="p-3.5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
              Play Registered Global Sequences
            </label>
            <p className="text-[10px] text-neutral-400 leading-normal">
              Select standard predefined sprite sheet movements loaded from global resources and inject them onto the active entity.
            </p>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar border border-neutral-800 rounded bg-neutral-900/50 p-1">
            {/* If we have global registered sequences, list them. If empty, show some preset animations. */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  // Pre-load default idle-walk sequences for character spritesheets onto selected entity
                  const assetPath = sprite?.assetId || 'assets/ninja-adventure/Actor/Characters/Boy/SpriteSheet.png';
                  
                  // Play standard sequence indices
                  engine.animations.registerGridSequence('hero_down_idle', assetPath, {
                    columnsCount: 16,
                    cellWidth: 16,
                    cellHeight: 16,
                    frameIndices: [0, 4, 8, 12],
                    loop: true,
                    frameRate: 6
                  });

                  engine.animations.registerGridSequence('hero_down_walk', assetPath, {
                    columnsCount: 16,
                    cellWidth: 16,
                    cellHeight: 16,
                    frameIndices: [0, 1, 2, 3],
                    loop: true,
                    frameRate: 8
                  });

                  engine.animations.registerGridSequence('hero_up_walk', assetPath, {
                    columnsCount: 16,
                    cellWidth: 16,
                    cellHeight: 16,
                    frameIndices: [16, 17, 18, 19],
                    loop: true,
                    frameRate: 8
                  });

                  engine.animations.play(engine.world, selectedEntityId, 'hero_down_walk');
                  forceUpdate();
                }}
                className="w-full text-left p-2 rounded hover:bg-indigo-600/20 text-neutral-300 hover:text-white transition-colors border border-dashed border-neutral-800 flex flex-col"
              >
                <div className="text-[11px] font-bold">👉 Setup Grid Pre-animations</div>
                <div className="text-[9px] text-neutral-400">Instantly generate top-down 4-direction keyframe grids for active sprite sheet.</div>
              </button>

              <button
                onClick={() => {
                  // Fireball procedural blast sequence
                  const assetPath = sprite?.assetId || 'assets/ninja-adventure/Actor/Characters/Boy/SpriteSheet.png';
                  engine.animations.registerGridSequence('plasma_spin', assetPath, {
                    columnsCount: 16,
                    cellWidth: 16,
                    cellHeight: 16,
                    frameIndices: [32, 33, 34, 35, 36, 37],
                    loop: true,
                    frameRate: 12
                  });
                  engine.animations.play(engine.world, selectedEntityId, 'plasma_spin');
                  forceUpdate();
                }}
                className="w-full text-left p-2 rounded hover:bg-indigo-600/20 text-neutral-300 hover:text-white transition-colors border border-dashed border-neutral-800 flex flex-col"
              >
                <div className="text-[11px] font-bold">👉 Setup Plasma Spin effect</div>
                <div className="text-[9px] text-neutral-400">Creates a high-speed spin sequence matching tile indexes on Boy/Ninja spritesheet.</div>
              </button>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded p-2.5 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center space-x-1">
              <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
              <span>Technical Animation Trace</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-neutral-400 leading-normal bg-neutral-950 p-2 rounded border border-neutral-850">
              <div>System: <span className="text-emerald-400">Canvas2D</span></div>
              <div>Buffer: <span className="text-emerald-400">ECS Render</span></div>
              <div>Width: <span className="text-indigo-400">{sprite?.frameWidth ?? 'Default (32)'}px</span></div>
              <div>Height: <span className="text-indigo-400">{sprite?.frameHeight ?? 'Default (32)'}px</span></div>
              <div className="col-span-2">Active Asset: <span className="text-amber-400 truncate block font-mono text-[8px] max-w-full">{sprite?.assetId ?? 'No Sprite'}</span></div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
