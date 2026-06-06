import { useState } from 'react';
import { Sparkles, Trash2, Bot } from 'lucide-react';
import { Tileset } from '../../core/resources/Tileset';
import { TilemapLayer } from '../../core/ecs/components/Tilemap';
import { useEngineStore } from '../../state/engine.store';

interface AutoCollisionCenterProps {
  activeTileset: Tileset;
  tileWidth: number;
  tileHeight: number;
  updateTileset: (t: Tileset) => void;
  getTilemapComponent: () => any;
  forceUpdate: () => void;
  addLog: (module: string, text: string, type?: 'info' | 'warn' | 'success' | 'error') => void;
}

export function AutoCollisionCenter({
  activeTileset,
  tileWidth,
  tileHeight,
  updateTileset,
  getTilemapComponent,
  forceUpdate,
  addLog
}: AutoCollisionCenterProps) {
  const { engine } = useEngineStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alphaThreshold, setAlphaThreshold] = useState<number>(15); // Opaque % threshold

  const isCrossOrigin = (url: string): boolean => {
    if (!url) return false;
    try {
      if (typeof window === 'undefined') return false;
      const origin = window.location.origin;
      const parsed = new URL(url, window.location.href);
      return parsed.origin !== origin;
    } catch {
      return false;
    }
  };

  /**
   * Mode 1: Synchronize Colliders based on the active Tileset solid definition
   */
  const handleAutoCollidersFromGround = () => {
    const comp = getTilemapComponent();
    if (!comp) {
      addLog('AUTO_COLLIDER', 'No active level Grid Map exists to scan.', 'error');
      return;
    }

    const groundLayer = comp.layers?.find((l: TilemapLayer) => l.id === 'layer-ground');
    const collisionLayer = comp.layers?.find((l: TilemapLayer) => l.id === 'layer-collision');
    if (!groundLayer || !collisionLayer) {
      addLog('AUTO_COLLIDER', 'Target Ground layer or Collision layer structures are missing.', 'warn');
      return;
    }

    let filledCount = 0;
    for (let i = 0; i < groundLayer.tiles.length; i++) {
      const tileId = groundLayer.tiles[i];
      if (tileId > 0) {
        // Trace solid metadata matching against loaded registrations
        const match = activeTileset.tiles.find(t => t.id === tileId);
        if (match && match.isSolid) {
          collisionLayer.tiles[i] = 1; // Mark as solid block
          filledCount++;
        }
      }
    }

    forceUpdate();
    addLog('AUTO_COLLIDER', `✓ Synchronized level: Painted ${filledCount} Solid blocks on collision layer based on Tileset constraints!`, 'success');
  };

  /**
   * Mode 2: Neural Pixel Alpha Density Scanner (analyzes PNG file pixels)
   */
  const handleSmartAlphaAutoCollision = async () => {
    if (!activeTileset.imageSrc) {
      addLog('AUTO_COLLIDER', 'Spritesheet image reference is missing for pixel tracing.', 'error');
      return;
    }

    setIsAnalyzing(true);
    addLog('AUTO_COLLIDER', 'Reading PNG spritesheet pixels to evaluate alpha channel density...', 'info');

    const img = new Image();
    const actualSrc = engine?.assets?.getAssetUrl(activeTileset.imageSrc) || activeTileset.imageSrc;
    if (isCrossOrigin(actualSrc)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsAnalyzing(false);
          return;
        }
        ctx.drawImage(img, 0, 0);

        const updatedTiles = [...activeTileset.tiles];
        let newlyFlaggedCount = 0;

        updatedTiles.forEach((tile: any) => {
          if (tile.u !== undefined && tile.v !== undefined) {
            const tx = tile.u * tileWidth;
            const ty = tile.v * tileHeight;
            const imgData = ctx.getImageData(tx, ty, tileWidth, tileHeight);
            const data = imgData.data;

            let opaquePixels = 0;
            const totalPixels = tileWidth * tileHeight;

            // Step in 4 bytes (R, G, B, A) checking the alpha opacity
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] > 80) { // Opaque enough
                opaquePixels++;
              }
            }

            const ratio = (opaquePixels / totalPixels) * 100;

            // If ratio of opaque pixels exceeds user-threshold, tag it as physical barrier
            if (ratio >= alphaThreshold) {
              if (!tile.isSolid) {
                tile.isSolid = true;
                newlyFlaggedCount++;
              }
            } else {
              tile.isSolid = false;
            }
          }
        });

        updateTileset({
          ...activeTileset,
          tiles: updatedTiles
        });

        setIsAnalyzing(false);
        addLog('AUTO_COLLIDER', `✓ Pixel scan complete! Analyzed ${activeTileset.tiles.length} cells. Mapped ${newlyFlaggedCount} new solid collision descriptors.`, 'success');
        
        // Auto-paint level triggers
        setTimeout(() => {
          handleAutoCollidersFromGround();
        }, 150);

      } catch (err: any) {
        setIsAnalyzing(false);
        addLog('AUTO_COLLIDER', 'Raster analysis failed due to canvas CORS restrictions of the image source.', 'error');
      }
    };

    img.onerror = () => {
      setIsAnalyzing(false);
      addLog('AUTO_COLLIDER', 'Error downloading the spritesheet texture buffer.', 'error');
    };

    img.src = actualSrc;
  };

  /**
   * Mode 3: Automatic cardinal edge perimeter wall builders
   */
  const handleAutoBorderColliders = () => {
    const comp = getTilemapComponent();
    if (!comp) {
      addLog('AUTO_COLLIDER', 'Target level Grid Map component missing.', 'error');
      return;
    }

    const groundLayer = comp.layers?.find((l: TilemapLayer) => l.id === 'layer-ground');
    const collisionLayer = comp.layers?.find((l: TilemapLayer) => l.id === 'layer-collision');
    if (!groundLayer || !collisionLayer) {
      addLog('AUTO_COLLIDER', 'Ensure ground and collision layers exist.', 'warn');
      return;
    }

    let borderPaintedCount = 0;
    const w = comp.width;
    const h = comp.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const currentTile = groundLayer.tiles[i];

        if (currentTile > 0) {
          let touchesVoid = false;
          // Cardinal offsets (Up, Down, Left, Right)
          const dirs = [
            [0, -1], [0, 1], [-1, 0], [1, 0]
          ];
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
              touchesVoid = true; // Screened border limits
              break;
            } else {
              const ni = ny * w + nx;
              if (groundLayer.tiles[ni] === 0) { // Touches void empty space
                touchesVoid = true;
                break;
              }
            }
          }

          if (touchesVoid) {
            collisionLayer.tiles[i] = 1; // solid flag
            borderPaintedCount++;
          }
        }
      }
    }

    forceUpdate();
    addLog('AUTO_COLLIDER', `✓ Edge Boundary sync: Generated ${borderPaintedCount} outlines collision boundaries!`, 'success');
  };

  /**
   * Clear all existing obstacles/colliders
   */
  const handleClearColliders = () => {
    const comp = getTilemapComponent();
    if (!comp) return;

    const collisionLayer = comp.layers?.find((l: TilemapLayer) => l.id === 'layer-collision');
    if (collisionLayer) {
      collisionLayer.tiles.fill(0);
      forceUpdate();
      addLog('AUTO_COLLIDER', '🗑 Reset all colliders. Collision layer empty.', 'warn');
    }
  };

  return (
    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3.5 shadow-md">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.55">
          <Bot className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Automated Collisions Masker</span>
        </span>
        <span className="text-[8.5px] bg-indigo-950/40 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-900/30">AI ASSIST</span>
      </div>

      <div className="space-y-2 text-xs leading-relaxed">
        {/* Ground alignment trace selector */}
        <div className="space-y-1 bg-neutral-950 p-2 rounded border border-neutral-850">
          <div className="flex justify-between items-center">
            <span className="font-bold text-neutral-350 text-[10px]">1. Sync Loaded Constraints</span>
            <span className="text-[8px] text-neutral-500 font-mono">TILE DIRECT</span>
          </div>
          <p className="text-[9px] text-neutral-500 leading-tight mb-1.5">
            Parses ground tiles and assigns Solid masks on Collision layer wherever physical items are detected.
          </p>
          <button
            type="button"
            onClick={handleAutoCollidersFromGround}
            className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-indigo-300 hover:text-white border border-neutral-800 hover:border-indigo-500/30 transition-all font-bold text-[9.5px] uppercase tracking-wide rounded"
          >
            Run Ground Align Sync
          </button>
        </div>

        {/* Neural Opacity Analyzer */}
        <div className="space-y-2 bg-neutral-950 p-2 rounded border border-neutral-850">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-neutral-350 text-[10px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>2. Neural Transparency Grid</span>
            </span>
            <span className="text-[8px] font-mono text-indigo-400">PIXEL LEVEL</span>
          </div>
          <p className="text-[9px] text-neutral-500 leading-tight">
            Scans raw PNG spritesheet pixels. Flag as Solid if opaque cells exceed selected criteria ratio.
          </p>
          
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
              <span>Opaque threshold percentage:</span>
              <span className="text-indigo-400 font-bold">{alphaThreshold}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={alphaThreshold}
              onChange={(e) => setAlphaThreshold(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <button
            type="button"
            disabled={isAnalyzing || !activeTileset.imageSrc}
            onClick={handleSmartAlphaAutoCollision}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all font-black text-[9.5px] uppercase tracking-wide rounded-lg flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            {isAnalyzing ? (
              <span>Analyzing Spritesheet...</span>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5 text-indigo-200" />
                <span>Extract Solid Pixels</span>
              </>
            )}
          </button>
        </div>

        {/* Outline boundary detector */}
        <div className="space-y-1 bg-neutral-950 p-2 rounded border border-neutral-850">
          <div className="flex justify-between items-center">
            <span className="font-bold text-neutral-350 text-[10px]">3. Cardinal Edge Outlines</span>
            <span className="text-[8px] text-neutral-500 font-mono">BOUNDARIES</span>
          </div>
          <p className="text-[9px] text-neutral-500 leading-tight mb-1.5">
            Calculates perimeter blocks where terrain textures meet sky/empty void, building collision edges.
          </p>
          <button
            type="button"
            onClick={handleAutoBorderColliders}
            className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-indigo-300 hover:text-white border border-neutral-800 hover:border-indigo-500/30 transition-all font-bold text-[9.5px] uppercase tracking-wide rounded"
          >
            Generate Edge Outlines
          </button>
        </div>

        {/* Clear Action button */}
        <button
          type="button"
          onClick={handleClearColliders}
          className="w-full py-1 px-2 border border-rose-500/20 hover:border-rose-500/55 bg-rose-950/10 hover:bg-rose-950/25 text-rose-300 transition-all font-bold text-[9px] uppercase tracking-wider rounded flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3 h-3 text-rose-455" />
          <span>Wipe Active Colliders Layer</span>
        </button>
      </div>
    </div>
  );
}
