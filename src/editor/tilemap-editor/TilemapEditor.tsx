import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  LayoutGrid, MousePointer2, Eraser, 
  ArrowUp, Plus, 
  Undo2, Redo2, Play, Sparkles, FileDown, CheckSquare,
  SlidersHorizontal
} from 'lucide-react';

import { useEngineStore } from '../../state/engine.store';
import { useEditorStore } from '../../state/editor.store';
import { useAssetStore } from '../../state/asset.store';
import { TilemapLayer, TilemapObject } from '../../core/ecs/components/Tilemap';
import { pushConsoleLog } from '../console-panel/ConsolePanel';
import { DEFAULT_TILESETS } from '../../core/resources/Tileset';
import { BrushSystem, BrushMode } from './BrushSystem';
import { TilesetCreatorModal } from './TilesetCreatorModal';

// Brand New Modular Sub-systems
import { AutoCollisionCenter } from './AutoCollisionCenter';
import { LayoutResizer } from './LayoutResizer';
import { LayerManager } from './LayerManager';
import { ObjectInspector } from './ObjectInspector';
import { SplicerWorkspace } from './SplicerWorkspace';

export interface TilemapEditorProps {
  initialMode?: 'paint' | 'splicer';
}

export function TilemapEditor({ initialMode = 'paint' }: TilemapEditorProps) {
  const engine = useEngineStore(state => state.engine);
  const selectedEntityId = useEditorStore(state => state.selectedEntityId);
  const forceUpdateState = useEditorStore(state => state.forceUpdate);

  const forceUpdate = useCallback(() => {
    forceUpdateState();
  }, [forceUpdateState]);

  // Read Assets
  const { 
    tilesets, 
    activeTilesetId, 
    setActiveTilesetId, 
    addTileset, 
    updateTileset 
  } = useAssetStore();

  const activeTileset = tilesets.find(ts => ts.id === activeTilesetId) || tilesets[0] || DEFAULT_TILESETS[0];

  // Canvas View Mode: Toggle inside unified panel ('paint' maps vs 'splicer' spritesheet coordinates)
  const [editorMode, setEditorMode] = useState<'paint' | 'splicer'>(initialMode);

  // Auto-sync tab modes when props shift
  useEffect(() => {
    setEditorMode(initialMode);
  }, [initialMode]);

  // Map Painting States
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-ground');
  const [selectedTile, setSelectedTile] = useState<number>(1);
  const [activeTool, setActiveTool] = useState<'draw' | 'erase' | 'select' | 'bucket' | 'rect' | 'line'>('draw');
  const [brushSize, setBrushSize] = useState<number>(1);
  const [autotileEnabled, setAutotileEnabled] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Splicer State
  const [splicingSelectedCell, setSplicingSelectedCell] = useState<{ u: number; v: number } | null>(null);
  const [newTileName, setNewTileName] = useState<string>('');
  const [newTileLabel, setNewTileLabel] = useState<string>('');
  const [newTileIsSolid, setNewTileIsSolid] = useState<boolean>(false);
  const [newTileDesc, setNewTileDesc] = useState<string>('');

  // Dialog panels toggles
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState<boolean>(false);

  // Splicing Dimensions
  const [tileWidth, setTileWidth] = useState<number>(activeTileset.tileWidth || 32);
  const [tileHeight, setTileHeight] = useState<number>(activeTileset.tileHeight || 32);

  // Opacities & Grids Rendering
  const [gridOpacity, setGridOpacity] = useState<number>(40);
  const [collisionOpacity, setCollisionOpacity] = useState<number>(75);
  const [resizeAnchor, setResizeAnchor] = useState<'tl' | 'tc' | 'tr' | 'cl' | 'cc' | 'cr' | 'bl' | 'bc' | 'br'>('tl');

  // Multi-Stamp Custom Brushes
  const [selectedStamp, setSelectedStamp] = useState<{ width: number; height: number; tiles: { du: number; dv: number; tileId: number }[] } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [placingObjectType, setPlacingObjectType] = useState<'player' | 'enemy' | 'coin' | 'chest' | 'key' | 'camera' | null>(null);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const splicerImageRef = useRef<HTMLImageElement>(null);
  const spritesheetInputRef = useRef<HTMLInputElement>(null);
  const brushSystemRef = useRef<BrushSystem>(new BrushSystem());

  // Log to Console Panel helper
  const addLog = useCallback((module: string, text: string, type: 'info' | 'warn' | 'success' | 'error' = 'info') => {
    pushConsoleLog(type, module, text);
  }, []);

  // Get active editing Tilemap ECS Component
  const getTilemapComponent = useCallback(() => {
    if (!engine || selectedEntityId === null) return undefined;
    const components = engine.world.getComponentsForEntity(selectedEntityId);
    const comp = components?.find((c: any) => c.type === 'tilemap');
    return comp;
  }, [engine, selectedEntityId]);

  const tilemapComponent = getTilemapComponent();

  // History State Tracking for Backtracking
  const recordHistory = useCallback(() => {
    const comp = getTilemapComponent();
    if (!comp) return;
    const miniState = JSON.stringify({
      layers: comp.layers.map((l: TilemapLayer) => ({ id: l.id, tiles: [...l.tiles] })),
      objects: [...comp.objects]
    });
    setUndoStack(prev => [...prev.slice(-99), miniState]);
    setRedoStack([]);
  }, [getTilemapComponent]);

  const handleUndo = useCallback(() => {
    const comp = getTilemapComponent();
    if (!comp || undoStack.length === 0) return;
    
    const currentMini = JSON.stringify({
      layers: comp.layers.map((l: TilemapLayer) => ({ id: l.id, tiles: [...l.tiles] })),
      objects: [...comp.objects]
    });
    setRedoStack(prev => [...prev, currentMini]);

    const prevMini = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    const data = JSON.parse(prevMini);
    data.layers.forEach((lDef: any) => {
      const match = comp.layers.find((layer: TilemapLayer) => layer.id === lDef.id);
      if (match) {
        match.tiles = lDef.tiles;
      }
    });
    comp.objects = data.objects;
    comp.tiles = comp.layers.find((l: TilemapLayer) => l.id === 'layer-ground')?.tiles || comp.tiles;

    forceUpdate();
    addLog('UNDO_REDO', 'Undone last editor painting action.', 'warn');
  }, [getTilemapComponent, undoStack, forceUpdate, addLog]);

  const handleRedo = useCallback(() => {
    const comp = getTilemapComponent();
    if (!comp || redoStack.length === 0) return;

    const currentMini = JSON.stringify({
      layers: comp.layers.map((l: TilemapLayer) => ({ id: l.id, tiles: [...l.tiles] })),
      objects: [...comp.objects]
    });
    setUndoStack(prev => [...prev, currentMini]);

    const nextMini = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    const data = JSON.parse(nextMini);
    data.layers.forEach((lDef: any) => {
      const match = comp.layers.find((layer: TilemapLayer) => layer.id === lDef.id);
      if (match) {
        match.tiles = lDef.tiles;
      }
    });
    comp.objects = data.objects;
    comp.tiles = comp.layers.find((l: TilemapLayer) => l.id === 'layer-ground')?.tiles || comp.tiles;

    forceUpdate();
    addLog('UNDO_REDO', 'Redone last editor painting action.', 'success');
  }, [getTilemapComponent, redoStack, forceUpdate, addLog]);

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyShortcut);
    return () => window.removeEventListener('keydown', handleKeyShortcut);
  }, [undoStack, redoStack, handleUndo, handleRedo]);

  // Automatic tile metadata sync
  useEffect(() => {
    if (activeTileset) {
      setTileWidth(activeTileset.tileWidth || 32);
      setTileHeight(activeTileset.tileHeight || 32);
    }
  }, [activeTileset]);

  const spritesheetSrc = activeTileset.imageSrc ? (engine?.assets?.getAssetUrl(activeTileset.imageSrc) || activeTileset.imageSrc) : null;
  const imageMetaColumns = activeTileset.columns || 8;
  const imageMetaRows = activeTileset.rows || 8;

  const calculatedCols = imageMetaColumns;
  const calculatedRows = imageMetaRows;

  // --- FLOOD FILL ALGORITHM (Flood fill recursive helper) ---
  const floodFillGrid = (tiles: number[], x: number, y: number, targetVal: number, fillVal: number, width: number, height: number) => {
    if (targetVal === fillVal) return;
    if (tiles[y * width + x] !== targetVal) return;

    const queue: [number, number][] = [[x, y]];
    const filled = new Set<string>();

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      const key = `${cx},${cy}`;
      if (filled.has(key)) continue;
      filled.add(key);

      const idx = cy * width + cx;
      tiles[idx] = fillVal;

      const adjacents = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (const [nx, ny] of adjacents) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          if (tiles[nidx] === targetVal) {
            queue.push([nx, ny]);
          }
        }
      }
    }
  };

  // --- BRESENHAM LINE DRAWING (Line brush helper) ---
  const drawLineBrush = (tiles: number[], x0: number, y0: number, x1: number, y1: number, fillVal: number, width: number) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    let drawing = true;
    while (drawing) {
      tiles[cy * width + cx] = fillVal;
      if (cx === x1 && cy === y1) {
        drawing = false;
        break;
      }
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  };

  // --- AUTOTILING LOGIC ---
  const processAutotileGrassBorders = (layer: TilemapLayer, tx: number, ty: number, width: number, height: number) => {
    const isSolidGround = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return true;
      const val = layer.tiles[y * width + x];
      return val === 1 || val === 2 || val === 12;
    };

    const top = isSolidGround(tx, ty - 1);
    const bottom = isSolidGround(tx, ty + 1);
    const left = isSolidGround(tx - 1, ty);
    const right = isSolidGround(tx + 1, ty);

    const idx = ty * width + tx;

    if (!top && bottom) {
      layer.tiles[idx] = 1;
    } else if (top && !bottom) {
      layer.tiles[idx] = 2;
    } else if (top && bottom && !left && right) {
      layer.tiles[idx] = 3;
    } else {
      layer.tiles[idx] = 1;
    }
  };

  // --- CORE CELL PICKER AND DRAWER MUTATION ROUTINES ---
  const handleCellAction = (gridX: number, gridY: number, e: React.PointerEvent) => {
    const comp = getTilemapComponent();
    if (!comp) return;

    const layer = comp.layers?.find((l: TilemapLayer) => l.id === activeLayerId);
    if (!layer) return;

    if (layer.locked) {
      if (e.type === 'pointerdown') {
        addLog('LAYER_MGR', `Layer "${layer.name}" is locked. Unlock it in the Manager to edit.`, 'warn');
      }
      return;
    }

    // Special click placing Object Layer
    if (activeLayerId === 'layer-collision') {
      if (activeTool === 'select') {
        const match = comp.objects.find((obj: TilemapObject) => obj.gridX === gridX && obj.gridY === gridY);
        if (match) {
          setSelectedObjectId(match.id);
          addLog('OBJECT_SYS', `Selected placed indicator: ${match.name} (${match.type})`, 'info');
        } else {
          setSelectedObjectId(null);
        }
        return;
      } else if (activeTool === 'draw') {
        handlePlaceObject(gridX, gridY);
        return;
      }
    }

    const valueToPaint = activeTool === 'draw' ? selectedTile : 0;
    const idx = gridY * comp.width + gridX;

    recordHistory();

    const isDrawingStamp = activeTool === 'draw' && selectedStamp !== null;

    if (isDrawingStamp && selectedStamp) {
      selectedStamp.tiles.forEach(cell => {
        const tx = gridX + cell.du;
        const ty = gridY + cell.dv;
        if (tx >= 0 && tx < comp.width && ty >= 0 && ty < comp.height) {
          const sIdx = ty * comp.width + tx;
          layer.tiles[sIdx] = cell.tileId;
        }
      });
    } else if (activeTool === 'draw' || activeTool === 'erase') {
      const mode: BrushMode = activeTool === 'draw' ? 'pencil' : 'eraser';
      brushSystemRef.current.applyBrush(
        layer,
        gridX,
        gridY,
        comp.width,
        comp.height,
        selectedTile,
        mode,
        {
          size: brushSize,
          autotileEnabled: autotileEnabled && activeLayerId === 'layer-ground'
        },
        (lx, ly) => processAutotileGrassBorders(layer, lx, ly, comp.width, comp.height)
      );
    } else if (activeTool === 'bucket') {
      const targetVal = layer.tiles[idx];
      floodFillGrid(layer.tiles, gridX, gridY, targetVal, valueToPaint, comp.width, comp.height);
    } else if (activeTool === 'rect' || activeTool === 'line') {
      if (e.type === 'pointerdown') {
        setSelectionBox({ startX: gridX, startY: gridY, endX: gridX, endY: gridY });
      }
    }

    comp.tiles = comp.layers.find((l: TilemapLayer) => l.id === 'layer-ground')?.tiles || comp.tiles;
    forceUpdate();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const comp = getTilemapComponent();
    if (!comp || !canvasRef.current || e.button !== 0) return;

    const bounds = canvasRef.current.getBoundingClientRect();
    const cellW = (comp.tileSize * zoomLevel);
    const relativeX = (e.clientX - bounds.left) / cellW;
    const relativeY = (e.clientY - bounds.top) / cellW;

    const gx = Math.floor(relativeX);
    const gy = Math.floor(relativeY);

    if (gx >= 0 && gx < comp.width && gy >= 0 && gy < comp.height) {
      canvasRef.current.setPointerCapture(e.pointerId);
      handleCellAction(gx, gy, e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const comp = getTilemapComponent();
    if (!comp || !canvasRef.current || !canvasRef.current.hasPointerCapture(e.pointerId)) return;

    const bounds = canvasRef.current.getBoundingClientRect();
    const cellW = (comp.tileSize * zoomLevel);
    const relativeX = (e.clientX - bounds.left) / cellW;
    const relativeY = (e.clientY - bounds.top) / cellW;

    const gx = Math.floor(relativeX);
    const gy = Math.floor(relativeY);

    if (gx >= 0 && gx < comp.width && gy >= 0 && gy < comp.height) {
      if (activeTool === 'rect' || activeTool === 'line') {
        if (selectionBox) {
          setSelectionBox(prev => prev ? { ...prev, endX: gx, endY: gy } : null);
        }
      } else {
        handleCellAction(gx, gy, e);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const comp = getTilemapComponent();
    if (!comp || !canvasRef.current || !canvasRef.current.hasPointerCapture(e.pointerId)) return;

    canvasRef.current.releasePointerCapture(e.pointerId);

    const layer = comp.layers?.find((l: TilemapLayer) => l.id === activeLayerId);
    if (layer && selectionBox) {
      recordHistory();
      const valueToPaint = activeTool === 'draw' ? selectedTile : 0;
      
      if (activeTool === 'rect') {
        const xStart = Math.min(selectionBox.startX, selectionBox.endX);
        const xEnd = Math.max(selectionBox.startX, selectionBox.endX);
        const yStart = Math.min(selectionBox.startY, selectionBox.endY);
        const yEnd = Math.max(selectionBox.startY, selectionBox.endY);

        for (let y = yStart; y <= yEnd; y++) {
          for (let x = xStart; x <= xEnd; x++) {
            const idx = y * comp.width + x;
            layer.tiles[idx] = valueToPaint;
          }
        }
      } else if (activeTool === 'line') {
        drawLineBrush(
          layer.tiles, 
          selectionBox.startX, 
          selectionBox.startY, 
          selectionBox.endX, 
          selectionBox.endY, 
          valueToPaint, 
          comp.width
        );
      }

      comp.tiles = comp.layers.find((l: TilemapLayer) => l.id === 'layer-ground')?.tiles || comp.tiles;
      forceUpdate();
    }

    setSelectionBox(null);
  };

  // Spawning object indicators
  const handlePlaceObject = (gridX: number, gridY: number) => {
    if (!placingObjectType) {
      addLog('OBJECT_SYS', 'Please pick a Spawning Character or object from the list first.', 'warn');
      return;
    }
    const comp = getTilemapComponent();
    if (!comp) return;

    recordHistory();
    const nextId = `indicator-${placingObjectType}-${Math.floor(10 + Math.random()*89)}`;
    const newObj: TilemapObject = {
      id: nextId,
      name: `${placingObjectType.toUpperCase()} Actor`,
      type: placingObjectType,
      gridX,
      gridY,
      properties: {}
    };

    if (!comp.objects) comp.objects = [];
    comp.objects.push(newObj);
    
    setSelectedObjectId(nextId);
    setPlacingObjectType(null); // click completed
    forceUpdate();

    addLog('OBJECT_SYS', `✓ Injected coordinate spawn placeholder: "${newObj.name}" at [X: ${gridX}, Y: ${gridY}]`, 'success');
  };

  // --- SPLICER CROPPING LOGIC ---
  const makeBase64Slice = (u: number, v: number): string | undefined => {
    if (!splicerImageRef.current) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = tileWidth;
    canvas.height = tileHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.drawImage(
      splicerImageRef.current,
      u * tileWidth,
      v * tileHeight,
      tileWidth,
      tileHeight,
      0,
      0,
      tileWidth,
      tileHeight
    );

    return canvas.toDataURL();
  };

  const handleSplicerCellClick = (u: number, v: number) => {
    setSplicingSelectedCell({ u, v });
    setNewTileName(`Cell_${u}_${v}`);
    setNewTileLabel(`Tile [Col ${u}, Row ${v}]`);
    setNewTileIsSolid(false);
    setNewTileDesc(`Texture fragment from spritesheet cell coordinates [Col ${u}, Row ${v}]`);
  };

  const handleAddSlicingTile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!splicingSelectedCell) return;

    const dataUri = makeBase64Slice(splicingSelectedCell.u, splicingSelectedCell.v);
    const existing = activeTileset.tiles.find(t => t.u === splicingSelectedCell.u && t.v === splicingSelectedCell.v);

    let nextTileId = activeTileset.tiles.length + 1;
    while (activeTileset.tiles.some(t => t.id === nextTileId)) {
      nextTileId++;
    }

    const tDef = {
      id: existing ? existing.id : nextTileId,
      name: newTileName.trim(),
      label: newTileLabel.trim(),
      color: '#475569',
      isSolid: newTileIsSolid,
      desc: newTileDesc.trim(),
      u: splicingSelectedCell.u,
      v: splicingSelectedCell.v,
      srcDataUri: dataUri
    };

    const nextTiles = existing
      ? activeTileset.tiles.map(t => (t.id === existing.id ? tDef : t))
      : [...activeTileset.tiles, tDef];

    updateTileset({
      ...activeTileset,
      tiles: nextTiles
    });

    addLog('TILESET_MGR', `✓ Registered custom tile metadata matching: "${tDef.label}"`, 'success');
  };

  const handleAutoExtractAll = () => {
    if (!spritesheetSrc) {
      addLog('TILESET_MGR', 'No PNG spritesheet source loaded to auto-extract.', 'error');
      return;
    }

    const counterStart = activeTileset.tiles.length + 1;
    let counter = counterStart;
    const extracted: any[] = [];

    for (let r = 0; r < calculatedRows; r++) {
      for (let c = 0; c < calculatedCols; c++) {
        const base64 = makeBase64Slice(c, r);
        extracted.push({
          id: counter++,
          name: `Idx_${c}_${r}`,
          label: `Tile [${c},${r}]`,
          color: '#475569',
          isSolid: false,
          desc: `Extracted grid cell from column ${c}, row ${r}`,
          u: c,
          v: r,
          srcDataUri: base64
        });
      }
    }

    updateTileset({
      ...activeTileset,
      tiles: [...activeTileset.tiles, ...extracted]
    });

    addLog('TILESET_MGR', `✓ Automatically registered all ${extracted.length} cells in the spritesheet grid coordinate space!`, 'success');
  };

  const handleRemoveTile = (tileId: number) => {
    const updated = activeTileset.tiles.filter(t => t.id !== tileId);
    updateTileset({
      ...activeTileset,
      tiles: updated
    });
    addLog('TILESET_MGR', `Removed definition details for Slice #${tileId}.`, 'warn');
  };

  const handleSplicerPngSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = () => {
      if (typeof fileReader.result === 'string') {
        updateTileset({
          ...activeTileset,
          imageSrc: fileReader.result
        });
        addLog('TILESET_MGR', `Uploaded and synced spritesheet image: "${file.name}"`, 'success');
      }
    };
    fileReader.readAsDataURL(file);
  };

  // Math-accurate grid resizing under anchor offsets and Grow parameters
  const handleResizeMap = (newW: number, newH: number) => {
    const comp = getTilemapComponent();
    if (!comp || newW < 2 || newH < 2 || newW > 100 || newH > 100) {
      addLog('RESIZER', 'Grid map width/height constraints must reside between 2 and 100.', 'error');
      return;
    }

    recordHistory();
    const oldW = comp.width;
    const oldH = comp.height;

    let offsetX = 0;
    let offsetY = 0;

    if (resizeAnchor === 'cl' || resizeAnchor === 'cc' || resizeAnchor === 'cr') offsetY = Math.floor((newH - oldH) / 2);
    else if (resizeAnchor === 'bl' || resizeAnchor === 'bc' || resizeAnchor === 'br') offsetY = newH - oldH;

    if (resizeAnchor === 'tc' || resizeAnchor === 'cc' || resizeAnchor === 'bc') offsetX = Math.floor((newW - oldW) / 2);
    else if (resizeAnchor === 'tr' || resizeAnchor === 'cr' || resizeAnchor === 'br') offsetX = newW - oldW;

    comp.layers.forEach((layer: any) => {
      const nextTiles = new Array(newW * newH).fill(0);
      for (let y = 0; y < oldH; y++) {
        for (let x = 0; x < oldW; x++) {
          const targetX = x + offsetX;
          const targetY = y + offsetY;
          if (targetX >= 0 && targetX < newW && targetY >= 0 && targetY < newH) {
            nextTiles[targetY * newW + targetX] = layer.tiles[y * oldW + x] || 0;
          }
        }
      }
      layer.tiles = nextTiles;
    });

    comp.objects.forEach((obj: any) => {
      obj.gridX += offsetX;
      obj.gridY += offsetY;
    });

    comp.width = newW;
    comp.height = newH;
    comp.tiles = comp.layers.find((l: TilemapLayer) => l.id === 'layer-ground')?.tiles || comp.tiles;

    forceUpdate();
    addLog('RESIZER', `✓ Expanded level workspace successfully matching size ${newW}x${newH} anchoring toward ${resizeAnchor.toUpperCase()}!`, 'success');
  };

  const handleImportJsonText = () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      if (!parsed.id || !parsed.name || !Array.isArray(parsed.tiles)) {
        throw new Error('Structural layout mismatch: Missing mandatory arrays.');
      }

      const tsObj = {
        id: String(parsed.id).toLowerCase().replace(/\s+/g, '-'),
        name: String(parsed.name),
        colorTheme: parsed.colorTheme || 'indigo',
        tiles: parsed.tiles,
        imageSrc: parsed.imageSrc,
        tileWidth: parsed.tileWidth || 32,
        tileHeight: parsed.tileHeight || 32,
        columns: parsed.columns || 8,
        rows: parsed.rows || 8
      };

      addTileset(tsObj);
      setActiveTilesetId(tsObj.id);
      setIsImportOpen(false);
      setImportJsonText('');
      addLog('TILESET_MGR', `✓ Parsed configuration imported: "${tsObj.name}"`, 'success');
    } catch (err: any) {
      setImportError(err.message || 'Error processing JSON format schema.');
    }
  };

  const handleExportMapJson = () => {
    const comp = getTilemapComponent();
    if (!comp) return;
    const mini = {
      width: comp.width,
      height: comp.height,
      tileSize: comp.tileSize,
      layers: comp.layers,
      objects: comp.objects
    };
    const stringified = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mini, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', stringified);
    anchor.setAttribute('download', 'level_map_setup.json');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    addLog('TILEMAP_SYS', '✓ Exported Level configuration JSON file.', 'success');
  };

  // Generate bounding styles
  const getSelectionBoxStyles = () => {
    if (!selectionBox || !tilemapComponent) return {};
    const xStart = Math.min(selectionBox.startX, selectionBox.endX);
    const xEnd = Math.max(selectionBox.startX, selectionBox.endX);
    const yStart = Math.min(selectionBox.startY, selectionBox.endY);
    const yEnd = Math.max(selectionBox.startY, selectionBox.endY);

    const size = tilemapComponent.tileSize * zoomLevel;
    return {
      position: 'absolute' as const,
      left: `${xStart * size}px`,
      top: `${yStart * size}px`,
      width: `${(xEnd - xStart + 1) * size}px`,
      height: `${(yEnd - yStart + 1) * size}px`,
      border: '2px dashed #818cf8',
      backgroundColor: 'rgba(129, 140, 248, 0.15)',
      pointerEvents: 'none' as const,
      zIndex: 20
    };
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950 text-neutral-200">
      
      {/* 1. MAIN UNIFIED STUDIO TOP ACTION BAR */}
      <header className="h-[48px] bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 select-none">
        
        {/* Title branding text */}
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-650 flex items-center justify-center font-black text-xs text-white shadow shadow-indigo-600/25">TS</div>
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black tracking-widest text-neutral-100 uppercase uppercase-wider">TileStudio Pro</span>
            <span className="text-[8px] text-neutral-500 font-mono font-medium -mt-0.5">UNIFIED INTEGRATED WORKSPACE</span>
          </div>
        </div>

        {/* Dynamic Center Workspaces Tab Toggles */}
        <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-850 shadow-inner">
          <button
            type="button"
            onClick={() => setEditorMode('paint')}
            className={`px-4 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              editorMode === 'paint' 
                ? 'bg-indigo-650 text-white shadow shadow-indigo-600/20' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Map Grid Painter</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('splicer')}
            className={`px-4 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              editorMode === 'splicer' 
                ? 'bg-indigo-650 text-white shadow shadow-indigo-600/20' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-450" />
            <span>Tile Coord Splicer</span>
          </button>
        </div>

        {/* Upper Undo-Redo & configuration export tools buttondeck */}
        <div className="flex items-center space-x-3 text-xs">
          
          {/* Zoom Selector Factor */}
          <div className="flex items-center bg-neutral-950 border border-neutral-850 rounded px-1 text-[10px] font-mono select-none">
            <span className="text-neutral-500 px-1">ZOOM:</span>
            {([0.5, 1, 1.5, 2, 4] as const).map(z => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-1 py-0.5 rounded text-[9.5px] font-medium transition-colors cursor-pointer ${
                  zoomLevel === z ? 'bg-neutral-800 text-indigo-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-neutral-800" />

          {/* History back/forth arrows */}
          <div className="flex bg-neutral-950 border border-neutral-850 rounded-lg p-0.5">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1 rounded text-neutral-500 hover:text-neutral-200 disabled:opacity-20 hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Undo Action (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1 rounded text-neutral-500 hover:text-neutral-200 disabled:opacity-20 hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Redo Action (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-800" />

          {/* Config actions */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleExportMapJson}
              className="p-1 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-850 px-2 rounded-lg flex items-center gap-1 font-bold text-[9px] uppercase tracking-wide cursor-pointer transition-all"
              title="Save whole Tilemap Layout grid JSON configuration"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export Level</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. THREE-PANEL DENSITY DESKTOP INTERFACE GRID VIEW */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* ========================================================= */}
        {/* A. LEFT PORT: ATLAS PALETTE & CURRENT TOOLS SELECTOR */}
        {/* ========================================================= */}
        <aside className="w-[285px] h-full flex flex-col bg-neutral-950 divide-y divide-neutral-800/80 shrink-0 select-none overflow-y-auto scrollbar-none border-r border-neutral-800">
          
          {/* Section 1: Active Spritesheet theme Selector */}
          <div className="p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Atlas Texture Theme</span>
            </div>

            <div className="space-y-1.5">
              <select
                value={activeTilesetId}
                onChange={e => setActiveTilesetId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                {tilesets.map(t => (
                  <option key={t.id} value={t.id}>🗺 [{t.id}] {t.name}</option>
                ))}
              </select>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setIsCreatorOpen(true)}
                  className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-600 rounded-lg text-indigo-100 hover:text-white text-[9.5px] font-bold uppercase tracking-wide transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Create New Tileset
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="px-2 py-1.5 bg-neutral-905 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 rounded-lg text-[9.5px] font-bold uppercase transition-all cursor-pointer"
                >
                  Import JSON
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Tools Palette & Brush Sizes */}
          <div className="p-3 space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Brush Tools Options ({activeTool.toUpperCase()})</span>
            </div>

            {/* Brush toggle indicators */}
            <div className="grid grid-cols-6 gap-1">
              {([
                { id: 'draw', icon: <Plus className="w-3.5 h-3.5" />, tip: 'Draw Pencil (B)' },
                { id: 'erase', icon: <Eraser className="w-3.5 h-3.5" />, tip: 'Eraser (E)' },
                { id: 'select', icon: <MousePointer2 className="w-3.5 h-3.5" />, tip: 'Select Arrow (S)' },
                { id: 'bucket', icon: <Sparkles className="w-3.5 h-3.5" />, tip: 'Flood Fill Bucket (G)' },
                { id: 'rect', icon: <CheckSquare className="w-3.5 h-3.5" />, tip: 'Rectangle Tool (R)' },
                { id: 'line', icon: <ArrowUp className="w-3.5 h-3.5 rotate-45" />, tip: 'Line Brush (L)' }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(t.id);
                    addLog('BRUSH_SYS', `Paint tool switched: "${t.id.toUpperCase()}"`, 'info');
                  }}
                  className={`p-1.5 rounded-lg flex items-center justify-center transition-all border ${
                    activeTool === t.id
                      ? 'bg-indigo-650 border-indigo-505/20 text-white shadow shadow-indigo-600/20'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-450 hover:text-neutral-200 hover:border-neutral-750'
                  }`}
                  title={t.tip}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            {/* Sizing sliders for pencil */}
            {(activeTool === 'draw' || activeTool === 'erase') && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-neutral-400">
                    <span className="font-semibold uppercase text-neutral-550">Brush sizing:</span>
                    <span className="font-mono text-indigo-400 font-bold">{brushSize}x{brushSize} cells</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={brushSize}
                    onChange={e => setBrushSize(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-indigo-505"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-neutral-950 p-1.5 rounded border border-neutral-850">
                  <input
                    type="checkbox"
                    id="autotiling-toggle-field"
                    checked={autotileEnabled}
                    onChange={e => setAutotileEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-neutral-850 accent-indigo-650 bg-neutral-950 cursor-pointer"
                  />
                  <label htmlFor="autotiling-toggle-field" className="select-none font-bold text-neutral-400 cursor-pointer text-[9.5px]">Autotile Grass Borders</label>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Click selection active brushes registry palette */}
          <div className="p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sliced Tiles Palette ({activeTileset.tiles.length})</span>
              </span>
              <span className="text-[8px] font-mono text-neutral-600">CLICK TO SECURE</span>
            </div>

            {activeTileset.tiles.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5 bg-neutral-900/35 p-1.5 rounded-xl border border-neutral-850 overflow-y-auto max-h-56 custom-scrollbar shrink-0">
                {activeTileset.tiles.map((tile) => {
                  const isSelected = selectedTile === tile.id;
                  return (
                    <button
                      key={tile.id}
                      onClick={() => {
                        setSelectedTile(tile.id);
                        setSelectedStamp(null); // clear stamp in favor of direct slice
                        addLog('BRUSH_SYS', `Selected active painting tile: "${tile.label || tile.name}" (ID #${tile.id})`, 'info');
                      }}
                      className={`aspect-square rounded-lg p-1.5 flex items-center justify-center relative transition-all border shrink-0 ${
                        isSelected 
                          ? 'bg-neutral-950 border-indigo-500/50 outline outline-2 outline-indigo-500/10' 
                          : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700'
                      }`}
                      title={`${tile.label || tile.name} (${tile.isSolid ? 'PHYSICAL WALL' : 'PASSTHROUGH BACKGROUND'})`}
                    >
                      {tile.srcDataUri ? (
                        <img 
                          src={tile.srcDataUri} 
                          alt={tile.name} 
                          className="max-w-full max-h-full object-contain pixelated pointer-events-none" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: tile.color }} />
                      )}
                      
                      {tile.isSolid && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-tl bg-rose-500 font-mono" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-neutral-800 p-4 rounded-xl flex flex-col justify-center items-center text-center text-neutral-550 leading-relaxed font-sans">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-450 block">Atlas empty</span>
                <p className="text-[9.5px] max-w-[200px] mt-0.5">Please click "Tile Coord Splicer" above to slice PNG cells and register them in the registry palette!</p>
              </div>
            )}
          </div>

          {/* Section 4: Spawner Placers */}
          {activeLayerId === 'layer-collision' && (
            <div className="p-3 space-y-1">
              <span className="text-[9.5px] uppercase font-bold text-neutral-550 block mb-1.5">Entities placers</span>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { id: 'player', label: 'Hero', icon: '👤' },
                  { id: 'enemy', label: 'Guard', icon: '👾' },
                  { id: 'coin', label: 'Coin', icon: '🪙' },
                  { id: 'chest', label: 'Chest', icon: '📦' },
                  { id: 'key', label: 'Key', icon: '🔑' },
                  { id: 'camera', label: 'Camera', icon: '🎥' }
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPlacingObjectType(opt.id);
                      addLog('OBJECT_SYS', `Active object placement set: "${opt.label}"`, 'info');
                    }}
                    className={`p-1.5 border rounded-lg flex flex-col items-center justify-center text-center transition-all ${
                      placingObjectType === opt.id
                        ? 'bg-amber-655 border-amber-500/40 text-amber-300 font-extrabold focus:outline-none'
                        : 'bg-neutral-900 border-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-sm mb-0.5">{opt.icon}</span>
                    <span className="text-[8.5px] uppercase font-bold tracking-wide">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Map Dimensions Workspace Resizer panel */}
          {tilemapComponent && (
            <div className="p-3 shrink-0">
              <LayoutResizer
                width={tilemapComponent.width}
                height={tilemapComponent.height}
                resizeAnchor={resizeAnchor}
                setResizeAnchor={setResizeAnchor}
                handleResizeMap={handleResizeMap}
              />
            </div>
          )}

        </aside>

        {/* ========================================================= */}
        {/* B. CENTRAL CHANNELS WORKWORK WORKSPACE AREA */}
        {/* ========================================================= */}
        {editorMode === 'paint' ? (
          /* LEVEL CANVAS PAINTER WORKSPACE */
          <div 
            className="flex-1 bg-neutral-950/90 flex items-center justify-center p-6 relative overflow-auto custom-scrollbar h-full w-0 select-none border-r border-neutral-800"
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Parallax grid backing */}
            <div className="absolute inset-0 pointer-events-none select-none" style={{
              backgroundImage: 'repeating-linear-gradient(#fff 0 1px, transparent 1px 100%), repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 100%)',
              backgroundSize: `${32 * zoomLevel}px ${32 * zoomLevel}px`,
              opacity: gridOpacity / 200,
            }}></div>

            {tilemapComponent ? (
              <div 
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                className="bg-neutral-900 border border-neutral-800 shadow-2xl relative select-none"
                style={{
                  width: tilemapComponent.width * tilemapComponent.tileSize * zoomLevel,
                  height: tilemapComponent.height * tilemapComponent.tileSize * zoomLevel,
                  transition: 'width 0.1s, height 0.1s'
                }}
              >
                
                {/* Active selection bounds */}
                {selectionBox && (
                  <div style={getSelectionBoxStyles()} />
                )}

                {/* Grid Canvas layers looping */}
                <div className="absolute inset-0 grid select-none" style={{
                  gridTemplateColumns: `repeat(${tilemapComponent.width}, 1fr)`,
                  gridTemplateRows: `repeat(${tilemapComponent.height}, 1fr)`
                }}>
                  {Array.from({ length: tilemapComponent.width * tilemapComponent.height }).map((_, i) => {
                    const gx = i % tilemapComponent.width;
                    const gy = Math.floor(i / tilemapComponent.width);
                    
                    const activeLayers: React.ReactNode[] = [];
                    
                    if (tilemapComponent.layers) {
                      for (const layer of tilemapComponent.layers) {
                        if (!layer.visible) continue;
                        const tileValue = layer.tiles[i];
                        if (tileValue > 0) {
                          if (layer.type === 'collision') {
                            const factor = (collisionOpacity / 100).toFixed(2);
                            const collors: Record<number, string> = {
                              1: `rgba(239, 68, 68, ${factor})`, // solid red bounds
                              2: `rgba(249, 115, 22, ${factor})`, 
                              3: `rgba(59, 130, 246, ${factor})`, 
                              4: `rgba(16, 185, 129, ${factor})` 
                            };
                            activeLayers.push(
                              <div key={`col_${layer.id}`} className="absolute inset-0 z-10" style={{ backgroundColor: collors[tileValue] || `rgba(139, 92, 246, ${factor})` }} />
                            );
                          } else {
                            // Find tile coordinate mapping matching key index
                            let matchedTile: any = null;
                            let matchedSplicer: any = null;
                            for (const ts of tilesets) {
                              const match = ts.tiles.find(t => t.id === tileValue);
                              if (match) {
                                matchedTile = match;
                                matchedSplicer = ts;
                                break;
                              }
                            }
                            
                            if (matchedTile && matchedSplicer) {
                              if (matchedSplicer.imageSrc) {
                                const bgUrl = engine?.assets?.getAssetUrl(matchedSplicer.imageSrc) || matchedSplicer.imageSrc;
                                activeLayers.push(
                                  <div 
                                    key={`img_${layer.id}`}
                                    className="absolute inset-0 bg-no-repeat"
                                    style={{
                                      backgroundImage: `url(${bgUrl})`,
                                      backgroundPosition: `-${(matchedTile.u || 0) * (matchedSplicer.tileWidth || 32)}px -${(matchedTile.v || 0) * (matchedSplicer.tileHeight || 32)}px`,
                                      backgroundSize: 'auto',
                                      imageRendering: 'pixelated',
                                      width: `${matchedSplicer.tileWidth || 32}px`,
                                      height: `${matchedSplicer.tileHeight || 32}px`,
                                      transform: `scale(${(tilemapComponent.tileSize * zoomLevel) / (matchedSplicer.tileWidth || 32)})`,
                                      transformOrigin: 'top left',
                                    }}
                                  />
                                );
                              } else {
                                activeLayers.push(
                                  <div key={`col_${layer.id}`} className="absolute inset-0" style={{ backgroundColor: matchedTile.color }} />
                                );
                              }
                            }
                          }
                        }
                      }
                    }

                    return (
                      <div 
                        key={i} 
                        className="relative border border-neutral-800/10 flex items-center justify-center text-[8px] text-neutral-500 font-mono"
                        style={{
                          width: tilemapComponent.tileSize * zoomLevel,
                          height: tilemapComponent.tileSize * zoomLevel
                        }}
                      >
                        {activeLayers}

                        {/* Interactive Placed Objects/Entities rendering handles under Grid map overlays */}
                        {tilemapComponent.objects?.map((obj: TilemapObject) => {
                          if (obj.gridX === gx && obj.gridY === gy) {
                            const isSelected = selectedObjectId === obj.id;
                            const emojiMap: Record<string, string> = {
                              player: '👤', enemy: '👾', coin: '🪙', chest: '📦', key: '🔑', camera: '🎥'
                            };
                            return (
                              <div
                                key={obj.id}
                                className={`absolute inset-0 flex items-center justify-center text-sm z-20 cursor-pointer ${
                                  isSelected ? 'ring-2 ring-amber-500 animate-pulse bg-amber-500/15' : 'hover:bg-indigo-500/10'
                                }`}
                                title={`Goal Spawner: ${obj.name}`}
                              >
                                {emojiMap[obj.type] || '❓'}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="text-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm">No Grid Map component exists.</div>
            )}
          </div>
        ) : (
          /* SPRITESHEET DATA COORD SPLICING WORKSPACE */
          <SplicerWorkspace
            activeTileset={activeTileset}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
            calculatedCols={calculatedCols}
            calculatedRows={calculatedRows}
            spritesheetSrc={spritesheetSrc}
            splicingSelectedCell={splicingSelectedCell}
            newTileName={newTileName}
            setNewTileName={setNewTileName}
            newTileLabel={newTileLabel}
            setNewTileLabel={setNewTileLabel}
            newTileIsSolid={newTileIsSolid}
            setNewTileIsSolid={setNewTileIsSolid}
            newTileDesc={newTileDesc}
            setNewTileDesc={setNewTileDesc}
            makeBase64Slice={makeBase64Slice}
            handleSplicerCellClick={handleSplicerCellClick}
            handleAddSlicingTile={handleAddSlicingTile}
            handleAutoExtractAll={handleAutoExtractAll}
            handleRemoveTile={handleRemoveTile}
            isImportOpen={isImportOpen}
            setIsImportOpen={setIsImportOpen}
            importJsonText={importJsonText}
            setImportJsonText={setImportJsonText}
            importError={importError}
            handleImportJsonText={handleImportJsonText}
            spritesheetInputRef={spritesheetInputRef}
            splicerImageRef={splicerImageRef}
          />
        )}

        {/* ========================================================= */}
        {/* C. RIGHT PORT: MODULE MANAGERS & AUTOMATED COLLIDERS LIST */}
        {/* ========================================================= */}
        <aside className="w-[305px] h-full flex flex-col bg-neutral-950 divide-y divide-neutral-800/80 shrink-0 select-none overflow-y-auto scrollbar-none border-l border-neutral-800">
          
          {/* Section 1: Layers dynamic deck manager */}
          {tilemapComponent && (
            <div className="p-3 shrink-0">
              <LayerManager
                layers={tilemapComponent.layers || []}
                activeLayerId={activeLayerId}
                setActiveLayerId={setActiveLayerId}
                getTilemapComponent={getTilemapComponent}
                forceUpdate={forceUpdate}
                recordHistory={recordHistory}
                addLog={addLog}
              />
            </div>
          )}

          {/* Section 2: Automated Collisions Generators masking suite */}
          <div className="p-3 shrink-0">
            <AutoCollisionCenter
              activeTileset={activeTileset}
              tileWidth={tileWidth}
              tileHeight={tileHeight}
              updateTileset={updateTileset}
              getTilemapComponent={getTilemapComponent}
              forceUpdate={forceUpdate}
              addLog={addLog}
            />
          </div>

          {/* Section 3: Spawn Entity Inspector Panel config */}
          <div className="p-3 shrink-0">
            <ObjectInspector
              selectedObjectId={selectedObjectId}
              objects={tilemapComponent?.objects || []}
              setSelectedObjectId={setSelectedObjectId}
              getTilemapComponent={getTilemapComponent}
              forceUpdate={forceUpdate}
              recordHistory={recordHistory}
              addLog={addLog}
            />
          </div>

          {/* Section 4: Grid opacities dials */}
          <div className="p-3 space-y-2.5 shrink-0">
            <span className="text-[9.5px] uppercase font-bold text-neutral-550 block mb-1">Canvas Grid dials</span>
            <div className="space-y-1.5 text-[10px]">
              <div>
                <div className="flex justify-between text-neutral-400 font-mono mb-1">
                  <span>Lines opacity:</span>
                  <span className="font-bold">{gridOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gridOpacity}
                  onChange={e => setGridOpacity(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-neutral-800 appearance-none cursor-pointer accent-indigo-505"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 font-mono mb-1">
                  <span>Solid overlay opacity:</span>
                  <span className="font-bold">{collisionOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={collisionOpacity}
                  onChange={e => setCollisionOpacity(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-neutral-800 appearance-none cursor-pointer accent-indigo-555"
                />
              </div>
            </div>
          </div>

        </aside>

      </div>

      {/* Hidden file input anchor */}
      <input 
        type="file" 
        ref={spritesheetInputRef} 
        onChange={handleSplicerPngSelected} 
        className="hidden" 
        accept="image/png" 
      />

      {/* Modal Dialog portal triggers */}
      {isCreatorOpen && (
        <TilesetCreatorModal 
          onClose={() => setIsCreatorOpen(false)} 
        />
      )}

    </div>
  );
}

// Backwards-compatible wrapper alias as requested
export function TileStudio(props: TilemapEditorProps) {
  return <TilemapEditor {...props} />;
}
