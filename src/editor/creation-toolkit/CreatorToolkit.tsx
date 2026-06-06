import { useState } from 'react';
import { 
  Plus, LayoutGrid, Volume2, HelpCircle, Sparkles, ArrowRight
} from 'lucide-react';
import { useEngineStore } from '../../state/engine.store';
import { useEditorStore } from '../../state/editor.store';
import { createTransform } from '../../core/ecs/components/Transform';
import { createSprite } from '../../core/ecs/components/Sprite';
import { createVelocity } from '../../core/ecs/components/Velocity';
import { createPlayerController } from '../../core/ecs/components/PlayerController';
import { createCollider } from '../../core/ecs/components/Collider';
import { createTilemap } from '../../core/ecs/components/Tilemap';
import { createCamera } from '../../core/ecs/components/Camera';
import { createAnimator } from '../../core/ecs/components/Animator';
import { isPackageInstalled, installAssetPackage } from '../../core/resources/AssetPackages';
import { emitEngineLog } from '../../core/events/EventBus';

export function CreatorToolkit() {
  const engine = useEngineStore((s) => s.engine);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const forceUpdate = useEditorStore((s) => s.forceUpdate);
  useEditorStore((s) => s.editorUpdateToken);

  const [activeTab, setActiveTab] = useState<'presets' | 'tilemap' | 'synth' | 'help'>('presets');

  // --- 1. Preset Spawners ---
  const spawnPreset = (preset: 'player' | 'coin' | 'floor' | 'slime' | 'camera' | 'parallax' | 'ninja_boy' | 'ninja_samurai' | 'space_ship_1' | 'ninja_monster') => {
    if (!engine) return;

    const entityId = engine.world.createEntity();
    
    if (preset === 'player') {
      engine.world.addComponent(entityId, 'transform', createTransform(120, 100));
      engine.world.addComponent(entityId, 'sprite', createSprite(32, 32, '#3b82f6')); // Indigo blue
      engine.world.addComponent(entityId, 'playerController', createPlayerController(150));
      engine.world.addComponent(entityId, 'velocity', createVelocity());
      engine.world.addComponent(entityId, 'collider', createCollider('box', 32, 32, 16));
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Controllable Player Hero (Entity ${entityId})! Click RUN and use WASD/Arrows to control.`);
    } 
    else if (preset === 'coin') {
      // Calculate random coords near center
      const rx = Math.floor(100 + Math.random() * 200);
      const ry = Math.floor(80 + Math.random() * 120);
      
      engine.world.addComponent(entityId, 'transform', createTransform(rx, ry));
      engine.world.addComponent(entityId, 'sprite', createSprite(16, 16, '#f59e0b')); // Yellow coin
      // Adds thin circular/box trigger collider
      engine.world.addComponent(entityId, 'collider', createCollider('circle', 16, 16, 8, 0, 0, true));
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Collectible Golden Coin (Entity ${entityId}) at coordinates (${rx}, ${ry}) with TRIGGER Collider.`);
    } 
    else if (preset === 'floor') {
      const cy = 250;
      engine.world.addComponent(entityId, 'transform', createTransform(30, cy));
      engine.world.addComponent(entityId, 'sprite', createSprite(260, 24, '#10b981')); // Green land
      engine.world.addComponent(entityId, 'collider', createCollider('box', 260, 24, 0));
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Solid Platfrom Brick (Entity ${entityId}). Other solid colliders will stop against it!`);
    } 
    else if (preset === 'slime') {
      const rx = Math.floor(150 + Math.random() * 150);
      engine.world.addComponent(entityId, 'transform', createTransform(rx, 150));
      engine.world.addComponent(entityId, 'sprite', createSprite(24, 20, '#ef4444')); // Red slime
      engine.world.addComponent(entityId, 'velocity', createVelocity(-40, 0)); // Moves leftward
      engine.world.addComponent(entityId, 'collider', createCollider('box', 24, 20, 12));
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Bouncing Slime Enemy (Entity ${entityId}) with left velocity (-40 px/s).`);
    }
    else if (preset === 'camera') {
      engine.world.addComponent(entityId, 'transform', createTransform(0, 0));
      engine.world.addComponent(entityId, 'camera', createCamera());
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Cinematic Follow Camera Controller (Entity ${entityId}) targeting the main viewport focus.`);
    }
    else if (preset === 'parallax') {
      const trans = createTransform(0, 0, 0);
      trans.scaleX = 2;
      trans.scaleY = 2;
      engine.world.addComponent(entityId, 'transform', trans);
      
      const sprite = createSprite(400, 240, '#0f172a');
      sprite.assetId = 'assets/backgrounds/backgrounds/1.png'; // Sample background from kits
      engine.world.addComponent(entityId, 'sprite', sprite);
      
      // Multiplier = 0.5 means it scrolls slower than normal foreground
      engine.world.addComponent(entityId, 'parallaxLayer', { multiplierX: 0.5, multiplierY: 0.5 });
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Parallax Background Controller (Entity ${entityId}). Scroll speeds can be adjusted in Inspector.`);
    }
    else if (preset === 'ninja_boy') {
      engine.world.addComponent(entityId, 'transform', createTransform(120, 100));
      const s = createSprite(16, 16, '#10b981');
      s.assetId = 'assets/ninja-adventure/ninja-adventure/characters/1.png';
      s.frameWidth = 16;
      s.frameHeight = 16;
      s.frameX = 0;
      s.frameY = 0;
      engine.world.addComponent(entityId, 'sprite', s);
      engine.world.addComponent(entityId, 'playerController', createPlayerController(150));
      engine.world.addComponent(entityId, 'velocity', createVelocity());
      engine.world.addComponent(entityId, 'collider', createCollider('box', 16, 16, 16));
      
      const animNode = createAnimator({
        walk_down: {
          name: 'walk_down',
          frames: [
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/1.png_0' },
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/1.png_1' },
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/1.png_2' },
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/1.png_3' }
          ],
          loop: true,
          frameRate: 8
        }
      });
      animNode.currentAnimation = 'walk_down';
      animNode.isPlaying = true;
      engine.world.addComponent(entityId, 'animator', animNode);
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Controllable Ninja Boy sprite controller! (Entity ${entityId}). WASD/Arrow support ready!`);
    }
    else if (preset === 'ninja_samurai') {
      engine.world.addComponent(entityId, 'transform', createTransform(150, 100));
      const s = createSprite(16, 16, '#f43f5e');
      s.assetId = 'assets/ninja-adventure/ninja-adventure/characters/7.png';
      s.frameWidth = 16;
      s.frameHeight = 16;
      s.frameX = 0;
      s.frameY = 0;
      engine.world.addComponent(entityId, 'sprite', s);
      engine.world.addComponent(entityId, 'playerController', createPlayerController(150));
      engine.world.addComponent(entityId, 'velocity', createVelocity());
      engine.world.addComponent(entityId, 'collider', createCollider('box', 16, 16, 16));
      
      const animNode = createAnimator({
        walk_down: {
          name: 'walk_down',
          frames: [
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/7.png_0' },
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/7.png_1' },
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/7.png_2' },
            { spriteId: 'assets/ninja-adventure/ninja-adventure/characters/7.png_3' }
          ],
          loop: true,
          frameRate: 8
        }
      });
      animNode.currentAnimation = 'walk_down';
      animNode.isPlaying = true;
      engine.world.addComponent(entityId, 'animator', animNode);
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Crimson Pink Samurai sprite controller! (Entity ${entityId}).`);
    }
    else if (preset === 'space_ship_1') {
      engine.world.addComponent(entityId, 'transform', createTransform(120, 100));
      const s = createSprite(32, 32, '#3b82f6');
      s.assetId = 'assets/space-shooter/space-shooter/ships/1.png';
      engine.world.addComponent(entityId, 'sprite', s);
      engine.world.addComponent(entityId, 'playerController', createPlayerController(200));
      engine.world.addComponent(entityId, 'velocity', createVelocity());
      engine.world.addComponent(entityId, 'collider', createCollider('box', 32, 32, 16));
      
      const animNode = createAnimator({
        thrust: {
          name: 'thrust',
          frames: [
            { spriteId: 'assets/space-shooter/space-shooter/ships/1.png' },
            { spriteId: 'assets/space-shooter/space-shooter/ships/2.png' }
          ],
          loop: true,
          frameRate: 10
        }
      });
      animNode.currentAnimation = 'thrust';
      animNode.isPlaying = true;
      engine.world.addComponent(entityId, 'animator', animNode);
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Cosmic Starship player controller! (Entity ${entityId}).`);
    }
    else if (preset === 'ninja_monster') {
      const rx = Math.floor(150 + Math.random() * 150);
      engine.world.addComponent(entityId, 'transform', createTransform(rx, 150));
      const s = createSprite(16, 16, '#9f1239');
      s.assetId = 'assets/ninja-adventure/ninja-adventure/monsters/1.png';
      s.frameWidth = 16;
      s.frameHeight = 16;
      s.frameX = 0;
      s.frameY = 0;
      engine.world.addComponent(entityId, 'sprite', s);
      engine.world.addComponent(entityId, 'velocity', createVelocity(-40, 0));
      engine.world.addComponent(entityId, 'collider', createCollider('box', 16, 16, 12));
      
      emitEngineLog('success', 'CREATOR_TOOL', `Spawned Patrolling RPG Monster (Entity ${entityId}) loading 1.png asset.`);
    }

    setSelectedEntity(entityId);
    forceUpdate();
  };

  // --- 2. Tilemap Builders ---
  const paintTilemapHelper = (action: 'ground' | 'borders' | 'checker' | 'clear') => {
    if (!engine) return;
    
    // Find selected entity with tilemap component, otherwise look for ANY tilemap in world
    let targetId = selectedEntityId;
    let tilemap = targetId !== null ? engine.world.getComponent<any>(targetId, 'tilemap') : null;

    if (!tilemap) {
      // Find the first entity that contains tilemap component
      const allEntities = engine.world.getAllEntities();
      for (const eid of allEntities) {
        const comp = engine.world.getComponent<any>(eid, 'tilemap');
        if (comp) {
          tilemap = comp;
          targetId = eid;
          break;
        }
      }
    }

    if (!tilemap) {
      // Prompt user to spawn a new Tilemap entity first
      const newId = engine.world.createEntity();
      engine.world.addComponent(newId, 'transform', createTransform(0, 0));
      tilemap = createTilemap(16, 12, 32);
      engine.world.addComponent(newId, 'tilemap', tilemap);
      targetId = newId;
      setSelectedEntity(newId);
      emitEngineLog('warn', 'CREATOR_TOOL', 'Created a new Tilemap Entity in scene (16x12 cells, 32px Size) as target.');
    }

    const { width, height, tiles } = tilemap;

    if (action === 'ground') {
      // Fills bottom grid rows (last 2 rows)
      for (let y = height - 2; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileIdx = y * width + x;
          tiles[tileIdx] = 12; // dark slate tile
        }
      }
      emitEngineLog('success', 'CREATOR_TOOL', `Laid solid ground floor on bottom rows of Tilemap Entity ${targetId}.`);
    } 
    else if (action === 'borders') {
      // Add walls on left, right, and top borders
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (x === 0 || x === width - 1 || y === 0) {
            tiles[y * width + x] = 14; // heavy black/slate blocks
          }
        }
      }
      emitEngineLog('success', 'CREATOR_TOOL', `Structured hard border wall boxes around Tilemap boundaries.`);
    } 
    else if (action === 'checker') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          tiles[y * width + x] = (x + y) % 2 === 0 ? 1 : 0;
        }
      }
      emitEngineLog('success', 'CREATOR_TOOL', `Filled Tilemap with a high-contrast vintage debugging checkerboard.`);
    } 
    else if (action === 'clear') {
      tiles.fill(0);
      emitEngineLog('warn', 'CREATOR_TOOL', `Purged and cleared all tiles on Entity ${targetId}.`);
    }

    forceUpdate();
  };

  // --- 3. Synthesizer Live Sound FX ---
  const synthesizeLiveSound = (soundType: 'coin' | 'laser' | 'jump' | 'explosion') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (soundType === 'coin') {
        // Classic 8-bit sweet coin pickup: high rapid arpeggio
        osc.type = 'square';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5 modulation
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        emitEngineLog('success', 'SYNTH', '🔊 Evaluated: Retro Double-Chime Coin SFX Tone.');
      } 
      else if (soundType === 'laser') {
        // Sci-fi sweep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        emitEngineLog('success', 'SYNTH', '🔊 Evaluated: Vintage 8-bit Phaser Laser pew sweep.');
      } 
      else if (soundType === 'jump') {
        // Smooth upward boing sweep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        emitEngineLog('success', 'SYNTH', '🔊 Evaluated: Platformer Character Jump scoop wave.');
      } 
      else if (soundType === 'explosion') {
        // Dynamic heavy white rumble simulation using frequency decay
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(10, now + 0.55);
        
        // Add rapid pulse to sound like crackling explosion
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        
        osc.start(now);
        osc.stop(now + 0.55);
        emitEngineLog('success', 'SYNTH', '🔊 Evaluated: Crashing Heavy Explosion Rumble frequency decay.');
      }
    } catch {
      // Ignore user audio initialization guard errors
    }
  };

  return (
    <div id="creator-toolkit-wrapper" className="flex flex-col h-full bg-neutral-900 border-b border-neutral-800">
      
      {/* Upper sub-header category buttons */}
      <div className="h-9 bg-neutral-900 border-b border-neutral-850 flex items-center justify-around shrink-0 px-2 select-none">
        {[
          { id: 'presets', label: 'Spawners', icon: Plus },
          { id: 'tilemap', label: 'Tile Painter', icon: LayoutGrid },
          { id: 'synth', label: 'Synth SFX', icon: Volume2 },
          { id: 'help', label: 'Guide List', icon: HelpCircle }
        ].map((btn) => {
          const Icon = btn.icon;
          const active = activeTab === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => setActiveTab(btn.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 py-1 px-1 h-full text-[10px] font-bold uppercase transition-all border-b-2 ${
                active 
                  ? 'text-indigo-400 border-indigo-500 bg-neutral-950/30' 
                  : 'text-neutral-500 hover:text-neutral-350 border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden leading-none md:inline">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main active category content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-neutral-950/40">
        
        {/* VIEW 1: ONE CLICK ENTITY PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">Entity Blueprints</h3>
              <p className="text-[10px] text-neutral-500">Inject prefab template actors directly into the game world.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => spawnPreset('player')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-indigo-900/40 hover:border-indigo-500/50 bg-indigo-950/15 hover:bg-indigo-950/30 text-indigo-100 transition-all group group-hover:scale-[1.01]"
              >
                <div className="flex items-start space-x-3 text-left">
                  <div className="p-1 px-1.5 rounded-md bg-indigo-550 text-indigo-100 font-bold text-xs select-none mt-0.5">🎮</div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold flex items-center gap-1.5">Movable Hero Character <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" /></div>
                    <p className="text-[10px] text-neutral-400 leading-normal">Binds player-controllers, solid bounding collider & movement physics vectors.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>

              <button
                onClick={() => spawnPreset('floor')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-emerald-900/40 hover:border-emerald-500/50 bg-emerald-950/15 hover:bg-emerald-950/30 text-emerald-100 transition-all group lg:scale-[1.01]"
              >
                <div className="flex items-start space-x-3 text-left">
                  <div className="p-1 px-1.5 rounded-md bg-emerald-650 text-emerald-100 font-bold text-xs select-none mt-0.5">🧱</div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold">Solid Platform Block</span>
                    <p className="text-[10px] text-neutral-400 leading-normal">Creates a ground surface entity with active rigid friction to stop falling objects.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>

              <button
                onClick={() => spawnPreset('coin')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-amber-900/40 hover:border-amber-500/50 bg-amber-950/15 hover:bg-amber-950/30 text-amber-100 transition-all group"
              >
                <div className="flex items-start space-x-3 text-left">
                  <div className="p-1 px-1.5 rounded-md bg-amber-550 text-amber-100 font-bold text-xs select-none mt-0.5">🪙</div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold">Golden Coin Coin</span>
                    <p className="text-[10px] text-neutral-400 leading-normal">A collectibles item configured with static spatial coords & trigger/collision handlers.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>

              <button
                onClick={() => spawnPreset('slime')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-rose-900/40 hover:border-rose-500/50 bg-rose-950/15 hover:bg-rose-950/30 text-rose-100 transition-all group"
              >
                <div className="flex items-start space-x-3 text-left">
                  <div className="p-1 px-1.5 rounded-md bg-rose-550 text-rose-100 font-bold text-xs select-none mt-0.5">👾</div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold">Patrolling slime enemy</span>
                    <p className="text-[10px] text-neutral-400 leading-normal">Produces moving bad character with speed components that shift left/right automatically.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>

              <button
                onClick={() => spawnPreset('camera')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-neutral-800 hover:border-neutral-750 hover:bg-neutral-900/40 text-neutral-200 transition-all group"
              >
                <div className="flex items-start space-x-3 text-left">
                  <div className="p-1 px-1.5 rounded-md bg-neutral-800 text-neutral-550 font-bold text-xs select-none mt-0.5">🎥</div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-neutral-300">Camera Tracker</span>
                    <p className="text-[10px] text-neutral-400 leading-normal">Injects a Camera controller that handles centering rendering focuses automatically on active bounds.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>

              <button
                onClick={() => spawnPreset('parallax')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-cyan-900/40 hover:border-cyan-500/50 bg-cyan-950/15 hover:bg-cyan-950/30 text-cyan-100 transition-all group"
              >
                <div className="flex items-start space-x-3 text-left">
                  <div className="p-1 px-1.5 rounded-md bg-cyan-600 text-cyan-100 font-bold text-xs select-none mt-0.5">🌌</div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-cyan-300">Parallax Background</span>
                    <p className="text-[10px] text-neutral-400 leading-normal">Adds a slower-scrolling background layer, linking assets dynamically from kitcompleto.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>
            </div>

            {/* Themed Premium Asset Spawners */}
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>Themed Asset Spawners</span>
                </h3>
                <p className="text-[10px] text-neutral-500">Spawn complex pre-animated game actors using premium downloaded asset packages.</p>
              </div>
              <div className="space-y-2">
                {[
                  {
                    id: 'ninja_boy' as const,
                    name: '🛡️ Ninja Adventurer',
                    desc: 'Top-down moving Ninja sprite with active walk cycles, controller & physics.',
                    theme: 'ninja-adventure',
                    color: 'border-emerald-950/50 bg-emerald-950/15 hover:border-emerald-500/50 text-emerald-100',
                    badge: 'bg-emerald-555'
                  },
                  {
                    id: 'ninja_samurai' as const,
                    name: '⚔️ Pink Samurai Hero',
                    desc: 'Fully animated character using RPG Pink Samurai texture sheet.',
                    theme: 'ninja-adventure',
                    color: 'border-rose-950/50 bg-rose-950/15 hover:border-rose-500/50 text-rose-100',
                    badge: 'bg-rose-555'
                  },
                  {
                    id: 'space_ship_1' as const,
                    name: '🚀 Cosmic Starfighter',
                    desc: 'Spacecraft vehicle styled with double-frame thruster active glow loop.',
                    theme: 'space-shooter',
                    color: 'border-blue-950/50 bg-blue-950/15 hover:border-blue-500/50 text-blue-100',
                    badge: 'bg-blue-555'
                  },
                  {
                    id: 'ninja_monster' as const,
                    name: '👾 RPG Skeleton Monster',
                    desc: 'Patrolling foe utilizing RPG pack monster sprites and physics bounds.',
                    theme: 'ninja-adventure',
                    color: 'border-amber-950/50 bg-amber-950/15 hover:border-amber-500/50 text-amber-100',
                    badge: 'bg-amber-555'
                  }
                ].map((item) => {
                  const installed = engine ? isPackageInstalled(engine, item.theme) : false;
                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-lg border p-2.5 transition-all ${
                        installed 
                          ? `${item.color} cursor-pointer hover:bg-neutral-900/40` 
                          : 'border-neutral-850 bg-neutral-950/40 opacity-75'
                      }`}
                      onClick={() => {
                        if (installed) spawnPreset(item.id);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-left space-y-0.5">
                          <span className="text-xs font-bold flex items-center gap-1.5 break-normal">
                            {item.name}
                            {!installed && (
                              <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1 py-0.5 rounded font-bold uppercase shrink-0">Locked</span>
                            )}
                          </span>
                          <p className="text-[10px] text-neutral-400 leading-normal">{item.desc}</p>
                        </div>
                        {installed && (
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                        )}
                      </div>
                      
                      {!installed && engine && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            emitEngineLog('info', 'CREATOR_TOOL', `Importing package "${item.theme}" for spawner presets...`);
                            await installAssetPackage(engine, item.theme);
                            forceUpdate();
                          }}
                          className="mt-2 w-full bg-indigo-650/15 hover:bg-indigo-650/35 text-indigo-400 hover:text-indigo-300 py-1 rounded text-[9px] uppercase font-bold tracking-wider font-mono border border-indigo-500/10 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                          <span>Import {item.theme} Pack</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Project Prefabs Section */}
            {engine && engine.prefabs.getAllPrefabs().length > 0 && (
              <div className="pt-4 border-t border-neutral-800 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>User Custom Prefabs</span>
                  </h3>
                  <p className="text-[10px] text-neutral-500">Instantiate project prefabs created from project assets straight to the viewport.</p>
                </div>
                <div className="space-y-2">
                  {engine.prefabs.getAllPrefabs().map((prefab: any) => (
                    <button
                      key={prefab.id}
                      onClick={() => {
                        const entId = engine.prefabs.instantiate(prefab.id);
                        if (entId !== null) {
                          emitEngineLog('success', 'CREATOR_TOOL', `Successfully instantiated Prefab: ${prefab.name} as Entity: ${entId}!`);
                          setSelectedEntity(entId);
                          forceUpdate();
                        }
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-indigo-900/40 hover:border-indigo-500/50 hover:bg-indigo-950/20 text-neutral-200 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start space-x-3 text-left overflow-hidden">
                        <div className="p-1 px-1.5 rounded-md bg-indigo-900 border border-indigo-700 text-indigo-100 font-mono text-[10px] select-none mt-0.5">PFB</div>
                        <div className="space-y-0.5 overflow-hidden">
                          <span className="text-xs font-bold block truncate">{prefab.name}</span>
                          <p className="text-[10px] text-neutral-400 truncate">ID: {prefab.id}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-400 font-semibold uppercase hover:text-indigo-300 shrink-0 ml-2">SPAWN</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: AUTOPAINTERS BRUSH ASSIST */}
        {activeTab === 'tilemap' && (
          <div className="space-y-3.5">
            <div>
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">Tile Grid Auto-Brush</h3>
              <p className="text-[10px] text-neutral-500">Accelerate level painting with automated layout structures.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                onClick={() => paintTilemapHelper('ground')}
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 hover:text-indigo-400 border border-neutral-800 text-neutral-300 text-left transition-all leading-relaxed"
              >
                <span className="text-xs font-bold block mb-1">🧱 Flat Ground</span>
                <span className="text-[10px] text-neutral-500 leading-normal">Fills bottom coordinate rows with firm solid platform tiling blocks instantly.</span>
              </button>

              <button
                onClick={() => paintTilemapHelper('borders')}
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 hover:text-indigo-400 border border-neutral-800 text-neutral-300 text-left transition-all leading-relaxed"
              >
                <span className="text-xs font-bold block mb-1">🏰 Grid Outer Walls</span>
                <span className="text-[10px] text-neutral-500 leading-normal">Adds border blocks around left/right boundaries to contain player falling.</span>
              </button>

              <button
                onClick={() => paintTilemapHelper('checker')}
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 hover:text-indigo-400 border border-neutral-800 text-neutral-300 text-left transition-all leading-relaxed"
              >
                <span className="text-xs font-bold block mb-1">🎲 Checkerboard Map</span>
                <span className="text-[10px] text-neutral-500 leading-normal">Generates checkered testing zones to measure coordinates or system ticks.</span>
              </button>

              <button
                onClick={() => paintTilemapHelper('clear')}
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-rose-950/30 hover:border-rose-900/40 border border-neutral-800 text-neutral-300 hover:text-rose-455 text-left transition-all leading-relaxed"
              >
                <span className="text-xs font-bold block mb-1">🧹 Empty Map Space</span>
                <span className="text-[10px] text-neutral-500 leading-normal text-rose-500">Purges and clears all active tiles to start design layout completely fresh.</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: RETRO SYNTH AUDIO GENERATOR */}
        {activeTab === 'synth' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">Retro wave SFX Synthesizer</h3>
              <p className="text-[10px] text-neutral-500">Evaluate 8-bit vintage acoustic chimes live using our built-in audio sweeps.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => synthesizeLiveSound('coin')}
                className="w-full p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-amber-500 text-xs">🔔</span>
                  <span className="text-xs font-bold text-neutral-300">Nostalgic double Coin Ding</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-500 font-semibold uppercase">PLAY CHIME</span>
              </button>

              <button
                onClick={() => synthesizeLiveSound('laser')}
                className="w-full p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-blue-500 text-xs">🚀</span>
                  <span className="text-xs font-bold text-neutral-300">Sci-Fi Blaster (Pew sweep)</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-500 font-semibold uppercase">PLAY PEW</span>
              </button>

              <button
                onClick={() => synthesizeLiveSound('jump')}
                className="w-full p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-500 text-xs">🦘</span>
                  <span className="text-xs font-bold text-neutral-300">Platformer Jump boing scoop</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-500 font-semibold uppercase">PLAY BOING</span>
              </button>

              <button
                onClick={() => synthesizeLiveSound('explosion')}
                className="w-full p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-rose-500 text-xs">💥</span>
                  <span className="text-xs font-bold text-neutral-300">Rumbling Heavy Explosion</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-500 font-semibold uppercase">PLAY CRASH</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: QUICK INSTRUCTION GUIDES */}
        {activeTab === 'help' && (
          <div className="space-y-3 text-neutral-300 select-text">
            <div>
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">Quick Creator Cheat Sheet</h3>
              <p className="text-[10px] text-neutral-500">How to combine components inside this Retro Sandbox SDK.</p>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <div className="p-2 border border-neutral-850 rounded-lg bg-neutral-900/50">
                <span className="font-bold text-indigo-400 block mb-0.5">🎮 WASD Key bindings:</span>
                <span className="text-neutral-450 font-sans">To configure WASD / arrow movement controls on your actors, select the entity and click **Add Component -&gt; Player Controller**!</span>
              </div>

              <div className="p-2 border border-neutral-850 rounded-lg bg-neutral-900/50">
                <span className="font-bold text-emerald-400 block mb-0.5">🧱 Solid physics & gravity:</span>
                <span className="text-neutral-450 font-sans">For characters to stay on the ground platform, they must have **Collider** AND **Velocity** components populated on their Inspector parameters!</span>
              </div>

              <div className="p-2 border border-neutral-850 rounded-lg bg-neutral-900/50">
                <span className="font-bold text-amber-400 block mb-0.5">🚀 Sandbox Live debugging:</span>
                <span className="text-neutral-450 font-sans">You can evaluate dynamic code in the console command terminal by referencing the globally exposed **engine**, **world** or **selectedEntityId** directly!</span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
