import { useEffect, useRef, useState } from 'react';
import { Engine } from '../../core/engine-core/Engine';
import { useEngineStore } from '../../state/engine.store';
import { useEditorStore } from '../../state/editor.store';
import { useProjectStore } from '../../state/project.store';
import { bootstrapEmeraldDungeon } from '../../legacy/bootstrappers/GameBootstrapper';
import { bootstrapCyberNinjaEscape } from '../../legacy/bootstrappers/CyberNinjaBootstrapper';
import { Transform } from '../../core/ecs/components/Transform';
import { Sprite } from '../../core/ecs/components/Sprite';
import { Grid, Maximize } from 'lucide-react';
import { retroEventBus } from '../../core/events/EventBus';
import { IRenderer } from '../../core/renderer/types';

export function SceneView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);
  const [entityCount, setEntityCount] = useState(0);
  const setEngine = useEngineStore((state) => state.setEngine);
  const forceUpdate = useEditorStore((state) => state.forceUpdate);
  const setSelectedEntity = useEditorStore((state) => state.setSelectedEntity);
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const engine = useEngineStore((state) => state.engine);

  // Editor settings
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(32);

  // Interaction refs
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragStartProps = useRef<{x: number, y: number} | null>(null);
  
  // Editor Camera State
  const editorCam = useRef({ x: 0, y: 0, zoom: 1 });

  // Sync grid options to refs to avoid tearing down and recreating entire engine on grid toggles
  const showGridRef = useRef(showGrid);
  const gridSizeRef = useRef(gridSize);

  useEffect(() => {
    showGridRef.current = showGrid;
  }, [showGrid]);

  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);

  useEffect(() => {
    if (engine && engine.pipeline && engine.pipeline.renderSystem) {
      engine.pipeline.renderSystem.selectionHighlightId = selectedEntityId;
      (window as any).selectedEntityId = selectedEntityId;
    }
  }, [selectedEntityId, engine]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const newEngine = new Engine();
    newEngine.init(canvasRef.current);

    const currentProj = useProjectStore.getState().projectName;
    if (currentProj === 'Top-Down RPG') {
      try {
        bootstrapEmeraldDungeon(newEngine);
      } catch (err) {
        console.error('Failed to bootstrap Emerald Dungeon:', err);
      }
    } else if (currentProj === 'Cyber Ninja Escape') {
      try {
        bootstrapCyberNinjaEscape(newEngine);
      } catch (err) {
        console.error('Failed to bootstrap Cyber Ninja Escape:', err);
      }
    }

    const hasAssets = newEngine.assets.getAllAssets().length > 0;
    if (!hasAssets) {
      import('../../core/resources/AssetPackages').then(({ installAssetPackage }) => {
        Promise.all([
          installAssetPackage(newEngine, 'ninja-adventure'),
          installAssetPackage(newEngine, 'backgrounds')
        ]).then(() => {
          forceUpdate();
        }).catch(err => {
          console.error('Failed to auto-install default packages:', err);
        });
      }).catch(err => {
        console.error('Failed to import default package installer:', err);
      });
    }
    
    (window as any).engine = newEngine;
    (window as any).world = newEngine.world;
    
    const engineFpsHandler = (data: { fps: number }) => setFps(data.fps);
    const engineEntityCountHandler = (data: { count: number }) => setEntityCount(data.count);
    
    // Post-render hook to draw grid and overlays agnostically via IRenderer
    const enginePostRenderHandler = (data: { renderer: IRenderer }) => {
      const { renderer } = data;
      const cam = (engine && engine.updateLogic) ? renderer.getCamera() : editorCam.current;
      const zoom = cam.zoom;

      // Draw Grid
      if (showGridRef.current && (!engine || !engine.updateLogic)) {
        // Apply camera matrix for world-space rendering (Grid & origin crosshair)
        renderer.beginFrame();

        const g = gridSizeRef.current;
        
        // Logical virtual resolution calculations (matching design aspect ratio resolution of 640x360)
        const viewWidth = 640 / zoom;
        const viewHeight = 360 / zoom;
        const startX = Math.floor((cam.x - viewWidth / 2) / g) * g;
        const endX = startX + viewWidth + g;
        const startY = Math.floor((cam.y - viewHeight / 2) / g) * g;
        const endY = startY + viewHeight + g;

        for (let x = startX; x <= endX; x += g) {
          renderer.drawRect(x, startY, 1 / zoom, endY - startY, 'rgba(255, 255, 255, 0.05)');
        }
        for (let y = startY; y <= endY; y += g) {
          renderer.drawRect(startX, y, endX - startX, 1 / zoom, 'rgba(255, 255, 255, 0.05)');
        }

        // Draw Origin Crosshair
        renderer.drawRect(-100, -1, 200, 2 / zoom, 'rgba(99, 102, 241, 0.25)');
        renderer.drawRect(-1, -100, 2 / zoom, 200, 'rgba(99, 102, 241, 0.25)');

        // Restore matrix for screen-space rendering (HUD overlays)
        renderer.endFrame();
      }

      // Live gameplay HUD overlay drawn directly in screen-space
      const projectName = useProjectStore.getState().projectName;
      if (projectName === 'Top-Down RPG') {
        const score = (window as any).gameScore !== undefined ? (window as any).gameScore : 0;
        const hp = (window as any).gameHealth !== undefined ? (window as any).gameHealth : 100;
        const status = (window as any).gameStatus || 'playing';
        const coins = (window as any).gameCoins !== undefined ? (window as any).gameCoins : 0;

        // Draw HUD glass frame top bar
        renderer.drawRect(12, 12, 616, 28, 'rgba(10, 10, 10, 0.85)');
        renderer.drawOutline(12, 12, 616, 28, 'rgba(16, 185, 129, 0.4)', 1);

        // Render Score Counter
        renderer.drawText(`SCORE: ${score.toString().padStart(4, '0')}`, 24, 30, '#10b981', 'bold 11px monospace');

        // Remaining Emerald crystals
        renderer.drawText(`CRYSTALS: ${coins} LEFT`, 160, 30, '#fbbf24', 'bold 11px monospace');

        // Health Bar Graphic
        renderer.drawText(`LIFE ENERGY:`, 320, 30, '#ef4444', 'bold 11px monospace');
        renderer.drawRect(405, 21, 100, 10, '#1f2937');
        const hpWidth = Math.max(0, Math.min(100, hp));
        const barColor = hp > 50 ? '#10b981' : (hp > 25 ? '#fbbf24' : '#ef4444');
        renderer.drawRect(405, 21, hpWidth, 10, barColor);
        renderer.drawOutline(405, 21, 100, 10, '#ffffff', 1);

        // Mini control key indicator
        renderer.drawText(`WASD/ARROWS: MOVE`, 522, 30, '#94a3b8', 'bold 9px monospace');

        // Playback Condition overlays
        if (status === 'gameover') {
          // Darkened doom-red vignette backdrop
          renderer.drawRect(0, 0, 640, 360, 'rgba(127, 29, 29, 0.6)');
          renderer.drawRect(170, 130, 300, 100, '#0a0a0a');
          renderer.drawOutline(170, 130, 300, 100, '#ef4444', 2);

          renderer.drawText('DIED IN EMERALD DUNGEON', 215, 170, '#ef4444', 'bold 14px monospace');
          renderer.drawText('PRESS STOP THEN PLAY TO RESTART', 213, 200, '#94a3b8', '9px monospace');
        } 
        else if (status === 'victory') {
          // Radiant green achievement overlay
          renderer.drawRect(0, 0, 640, 360, 'rgba(6, 78, 59, 0.6)');
          renderer.drawRect(150, 110, 340, 130, '#0a0a0a');
          renderer.drawOutline(150, 110, 340, 130, '#10b981', 2);

          renderer.drawText('VICTORY ACHIEVED!', 240, 150, '#10b981', 'bold 16px monospace');
          renderer.drawText('Crystal Recovery Mission Complete!', 185, 185, '#ffffff', '11px monospace');
          renderer.drawText('Final Score Recalled: ' + score, 235, 215, '#fbbf24', 'bold 11px monospace');
        }
      } else if (projectName === 'Cyber Ninja Escape') {
        const score = (window as any).gameScore !== undefined ? (window as any).gameScore : 0;
        const hp = (window as any).gameHealth !== undefined ? (window as any).gameHealth : 100;
        const status = (window as any).gameStatus || 'playing';
        const coins = (window as any).gameCoins !== undefined ? (window as any).gameCoins : 0;
        const hasCheckpoint = (window as any).checkpointReached || false;

        // Draw Cyberpunk holographic glass bar
        renderer.drawRect(12, 12, 616, 28, 'rgba(2, 6, 23, 0.9)');
        renderer.drawOutline(12, 12, 616, 28, 'rgba(6, 182, 212, 0.6)', 1); // Neon cyan cyber boundary

        // Score
        renderer.drawText(`CYBERNET: ${score}`, 24, 30, '#06b6d4', 'bold 11px monospace');

        // Checkpoint status
        const cpText = hasCheckpoint ? 'CHECKPOINT: SYNCED' : 'CHECKPOINT: OFF';
        const cpColor = hasCheckpoint ? '#10b981' : '#f43f5e';
        renderer.drawText(cpText, 145, 30, cpColor, 'bold 10px monospace');

        // Datacores
        renderer.drawText(`DATACORES: ${coins} REQ`, 280, 30, '#f59e0b', 'bold 10px monospace');

        // Nanoshield / Integrity Tracker
        renderer.drawText(`INTEGRITY:`, 405, 30, '#ec4899', 'bold 10px monospace');
        renderer.drawRect(475, 21, 60, 10, '#0f172a');
        const shieldWidth = Math.max(0, Math.min(60, (hp / 100) * 60));
        const integrityColor = hp > 50 ? '#06b6d4' : (hp > 25 ? '#eab308' : '#e11d48');
        renderer.drawRect(475, 21, shieldWidth, 10, integrityColor);
        renderer.drawOutline(475, 21, 60, 10, 'rgba(6, 182, 212, 0.4)', 1);

        // Control mode indicator
        renderer.drawText(`[HACK ACTIVE]`, 545, 30, '#10b981', 'bold 9px monospace');

        // Game Over Overlay
        if (status === 'gameover') {
          renderer.drawRect(0, 0, 640, 360, 'rgba(15, 23, 42, 0.8)');
          renderer.drawRect(170, 120, 300, 120, '#020617');
          renderer.drawOutline(170, 120, 300, 120, '#ec4899', 2); // Neon pink glowing hazard border

          renderer.drawText('HACK OVERRIDE TERMINATED', 205, 160, '#ec4899', 'bold 13px monospace');
          renderer.drawText('SYSTEM CORE DISCONNECTED', 215, 185, '#94a3b8', 'bold 11px monospace');
          renderer.drawText('CHOOSE STOP THEN PLAY TO HACK AGAIN', 190, 215, '#06b6d4', '9px monospace');
        } 
        // Victory overlay
        else if (status === 'victory') {
          renderer.drawRect(0, 0, 640, 360, 'rgba(2, 6, 23, 0.85)');
          renderer.drawRect(140, 110, 360, 140, '#020617');
          renderer.drawOutline(140, 110, 360, 140, '#06b6d4', 2);

          renderer.drawText('DUNGEON ESCAPE INFILTRATION COMPLETE!', 165, 150, '#06b6d4', 'bold 13px monospace');
          renderer.drawText('ALL SECURE FILES SUCCESSFULLY RECOVERED', 160, 175, '#10b981', 'bold 11px monospace');
          renderer.drawText('Decryption Key Generated Successfully!', 178, 205, '#ffffff', '11px monospace');
          renderer.drawText(`FINAL RECORDED SCORE: ${score}`, 215, 230, '#fbbf24', 'bold 11px monospace');
        }
      }
    };

    retroEventBus.on('engine-fps', engineFpsHandler);
    retroEventBus.on('engine-entity-count', engineEntityCountHandler);
    retroEventBus.on('engine-post-render', enginePostRenderHandler);
    
    setEntityCount(newEngine.world.getEntityCount());
    setEngine(newEngine);
    forceUpdate();

    newEngine.start();

    return () => {
      retroEventBus.off('engine-fps', engineFpsHandler);
      retroEventBus.off('engine-entity-count', engineEntityCountHandler);
      retroEventBus.off('engine-post-render', enginePostRenderHandler);
      newEngine.stop();
      setEngine(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEngine, forceUpdate]); // showGrid and gridSize removed to eliminate engine re-creation on grid adjustments

  // Keep renderer camera in sync with editorCam when paused structure updates
  useEffect(() => {
    if (engine && !engine.updateLogic) {
      engine.renderer.setCamera(editorCam.current.x, editorCam.current.y, editorCam.current.zoom);
    }
  }, [engine, showGrid]); // trigger re-render on dependency change

  const applyCamera = () => {
    if (engine && !engine.updateLogic) {
      engine.renderer.setCamera(editorCam.current.x, editorCam.current.y, editorCam.current.zoom);
    }
  };

  const getActiveCamera = () => {
    if (engine && engine.updateLogic) {
      return engine.renderer.getCamera();
    }
    return editorCam.current;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return; // Only process left click for selection
    
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    // Convert to world space
    const cam = getActiveCamera();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const cx = ((px * scaleX) - canvasRef.current!.width / 2) / cam.zoom + cam.x;
    const cy = ((py * scaleY) - canvasRef.current!.height / 2) / cam.zoom + cam.y;

    const entities = [...engine.world.getEntitiesWith('transform')].reverse();
    let clickedEntity: number | null = null;
    
    for (const entity of entities) {
      const transform = engine.world.getComponent<Transform>(entity, 'transform');
      const sprite = engine.world.getComponent<Sprite>(entity, 'sprite');
      const collider = engine.world.getComponent<any>(entity, 'collider');
      const tilemap = engine.world.getComponent<any>(entity, 'tilemap');
      
      if (transform) {
        let left = 0, right = 0, top = 0, bottom = 0;
        let boundsFound = false;

        const gx = transform.globalX !== undefined ? transform.globalX : transform.x;
        const gy = transform.globalY !== undefined ? transform.globalY : transform.y;
        const sX = transform.globalScaleX !== undefined ? transform.globalScaleX : transform.scaleX;
        const sY = transform.globalScaleY !== undefined ? transform.globalScaleY : transform.scaleY;

        if (sprite) {
          const w = sprite.width * Math.abs(sX);
          const h = sprite.height * Math.abs(sY);
          left = gx - w / 2;
          right = gx + w / 2;
          top = gy - h / 2;
          bottom = gy + h / 2;
          boundsFound = true;
        } else if (collider) {
          const w = collider.width * Math.abs(sX);
          const h = collider.height * Math.abs(sY);
          const ox = collider.offsetX * sX;
          const oy = collider.offsetY * sY;
          left = gx + ox - w / 2;
          right = gx + ox + w / 2;
          top = gy + oy - h / 2;
          bottom = gy + oy + h / 2;
          boundsFound = true;
        } else if (tilemap) {
          // Tilemaps grow from top-left
          const w = tilemap.width * tilemap.tileSize;
          const h = tilemap.height * tilemap.tileSize;
          left = gx;
          right = gx + w;
          top = gy;
          bottom = gy + h;
          boundsFound = true;
        }
        
        if (boundsFound && cx >= left && cx <= right && cy >= top && cy <= bottom) {
          clickedEntity = entity;
          break;
        }
      }
    }
    
    setSelectedEntity(clickedEntity);
    
    if (clickedEntity !== null) {
      isDragging.current = true;
      lastMousePos.current = { x: cx, y: cy };
      const transform = engine.world.getComponent<Transform>(clickedEntity, 'transform');
      if (transform) {
        dragStartProps.current = { x: transform.x, y: transform.y };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning.current) {
      const scaleX = canvasRef.current!.width / rect.width;
      const scaleY = canvasRef.current!.height / rect.height;
      const dx = (e.clientX - lastMousePos.current.x) * scaleX;
      const dy = (e.clientY - lastMousePos.current.y) * scaleY;
      
      const cam = editorCam.current;
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
      
      applyCamera();
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDragging.current && selectedEntityId !== null) {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      
      const cam = getActiveCamera();
      const scaleX = canvasRef.current!.width / rect.width;
      const scaleY = canvasRef.current!.height / rect.height;
      const cx = ((px * scaleX) - canvasRef.current!.width / 2) / cam.zoom + cam.x;
      const cy = ((py * scaleY) - canvasRef.current!.height / 2) / cam.zoom + cam.y;

      const transform = engine.world.getComponent<Transform>(selectedEntityId, 'transform');
      if (transform && dragStartProps.current) {
        // Delta in World Space
        const deltaWorldX = cx - lastMousePos.current.x;
        const deltaWorldY = cy - lastMousePos.current.y;
        
        // Convert to Local Space delta
        const pScaleX = transform.scaleX !== 0 ? (transform.globalScaleX / transform.scaleX) : 1;
        const pScaleY = transform.scaleY !== 0 ? (transform.globalScaleY / transform.scaleY) : 1;
        
        const localDeltaX = deltaWorldX / (pScaleX !== 0 ? pScaleX : 1);
        const localDeltaY = deltaWorldY / (pScaleY !== 0 ? pScaleY : 1);

        let newX = transform.x + localDeltaX;
        let newY = transform.y + localDeltaY;
        
        if (snapToGrid) {
           newX = Math.round(newX / gridSize) * gridSize;
           newY = Math.round(newY / gridSize) * gridSize;
        }

        transform.x = newX;
        transform.y = newY;
      }
      
      lastMousePos.current = { x: cx, y: cy };
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    isPanning.current = false;

    if (isDragging.current && selectedEntityId !== null && engine && dragStartProps.current) {
      const transform = engine.world.getComponent<Transform>(selectedEntityId, 'transform');
      if (transform) {
        const finalX = transform.x;
        const finalY = transform.y;
        
        if (finalX !== dragStartProps.current.x || finalY !== dragStartProps.current.y) {
          transform.x = dragStartProps.current.x;
          transform.y = dragStartProps.current.y;
          
          const { ModifyComponentCommand } = await import('../../core/command-system/commands/ModifyComponentCommand');
          const cmd = new ModifyComponentCommand(engine, selectedEntityId, 'transform', { x: finalX, y: finalY });
          engine.commands.executeCommand(cmd);
          forceUpdate(); // Keep inspector in sync at end of drag
        }
      }
    }
    isDragging.current = false;
    dragStartProps.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // stop browser scroll
    if (engine && engine.updateLogic) return; // Disallow zoom when game overrides camera
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    
    // cursor position on virtual canvas
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    
    const cam = editorCam.current;
    
    // Determine world coordinates before zooming
    const hw = canvasRef.current!.width / 2;
    const hh = canvasRef.current!.height / 2;
    const wx = ((px - hw) / cam.zoom) + cam.x;
    const wy = ((py - hh) / cam.zoom) + cam.y;

    const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
    let newZoom = cam.zoom * zoomFactor;
    newZoom = Math.max(0.1, Math.min(newZoom, 10)); // Clamp zoom between 0.1x to 10x
    
    // Adjust camera x,y so world coords stay pinned to cursor
    cam.x = wx - ((px - hw) / newZoom);
    cam.y = wy - ((py - hh) / newZoom);
    cam.zoom = newZoom;
    
    applyCamera();
  };

  // Center view on origin
  const centerView = () => {
    editorCam.current = { x: 0, y: 0, zoom: 1 };
    applyCamera();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative bg-neutral-950" ref={containerRef}>
      {/* Grid Pattern Background for outer area */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.1]" 
        style={{
          backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
      />

      {/* Editor Top Bar Overlays */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
        
        {/* Left Status */}
        <div className="bg-neutral-900/90 backdrop-blur border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center space-x-4 shadow-xl pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">FPS</span>
            <span className="text-xs font-mono font-bold text-emerald-400 leading-none mt-0.5">{fps}</span>
          </div>
          <div className="w-px h-6 bg-neutral-800"></div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Entities</span>
            <span className="text-xs font-mono font-bold text-indigo-400 leading-none mt-0.5">{entityCount}</span>
          </div>
          <div className="w-px h-6 bg-neutral-800"></div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Zoom</span>
            <span className="text-xs font-mono font-bold text-neutral-300 leading-none mt-0.5">{(editorCam.current.zoom * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Right Tools */}
        <div className="bg-neutral-900/90 backdrop-blur border border-neutral-800 p-1 rounded-lg flex items-center space-x-1 shadow-xl pointer-events-auto">
          <button 
            onClick={centerView}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Reset View (Center Origin)"
          >
            <Maximize className="w-4 h-4" />
          </button>
          
          <div className="w-px h-4 bg-neutral-800 mx-1"></div>
          
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}
            title="Toggle Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-colors flex items-center space-x-1 ${snapToGrid ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white border border-transparent'}`}
            title="Toggle Snap to Grid"
          >
            <span>Snap</span>
            {snapToGrid && <span className="bg-indigo-500 text-white px-1 py-0.5 rounded ml-1 text-[8px] leading-none">{gridSize}</span>}
          </button>

          {snapToGrid && (
             <select 
               value={gridSize} 
               onChange={(e) => setGridSize(Number(e.target.value))}
               className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded ml-1 py-1 px-1 focus:outline-none"
             >
               <option value="8">8px</option>
               <option value="16">16px</option>
               <option value="32">32px</option>
               <option value="64">64px</option>
             </select>
          )}
        </div>

      </div>
      
      {/* Render Canvas Container - Flexible layout */}
      <div className="relative z-10 mx-4 max-w-full flex-1 w-[calc(100%-2rem)] max-h-[calc(100%-8rem)] bg-neutral-900 overflow-hidden rounded-xl border border-neutral-800 shadow-2xl flex items-center justify-center ring-1 ring-black/50">
        <canvas 
          ref={canvasRef} 
          width={640} // Internal render resolution for retro pixel art
          height={360}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          // Using w-full h-full scales the logical 640x360 canvas to fill the container! 
          // We apply object-contain to preserve aspect ratio.
          className="w-full h-full object-contain [image-rendering:pixelated] cursor-crosshair touch-none"
        />
        
        {/* Help hint */}
        <div className="absolute bottom-2 left-2 text-[9px] uppercase font-bold text-neutral-600 bg-neutral-950/80 px-2 py-1 rounded">
          MWheel: Zoom  •  MClick / Alt+LClick: Pan
        </div>
      </div>
      
    </div>
  );
}
