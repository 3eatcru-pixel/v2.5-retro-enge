import React, { useState, useEffect } from 'react';
import { Download, Eraser, PaintBucket, PenTool, Trash2, ZoomIn, ZoomOut, Save } from 'lucide-react';
import { useEngineStore } from '../../state/engine.store';
import { pushConsoleLog } from '../console-panel/ConsolePanel';
import { retroEventBus } from '../../core/events/EventBus';

type GridSize = 16 | 32;
type Tools = 'pencil' | 'eraser' | 'fill';

export function SpriteEditor() {
  const engine = useEngineStore(state => state.engine);
  const [size, setSize] = useState<GridSize>(16);
  // Store pixel colors, indexed by y * size + x
  const [pixels, setPixels] = useState<string[]>(Array(16 * 16).fill(''));
  const [currentColor, setCurrentColor] = useState<string>('#ffffff');
  const [currentTool, setCurrentTool] = useState<Tools>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Embedded modal state for error-free iframe operations
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Default color palette typical of 16-bit / retro vibes
  const palette = [
    '#ffffff', '#000000', '#ff0044', '#00ff99', 
    '#4400ff', '#ffee00', '#00ccff', '#ff00ff',
    '#555555', '#aaaaaa', '#ffaa00', '#00aa00',
    '#0000aa', '#aa0000', '#00aaaa', '#aa00aa',
  ];

  // Effect to reset grid when size changes
  useEffect(() => {
    setPixels(Array(size * size).fill(''));
  }, [size]);

  const setPixel = (x: number, y: number, color: string) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const index = y * size + x;
    
    setPixels(prev => {
      const newPixels = [...prev];
      newPixels[index] = color;
      return newPixels;
    });
  };

  const getPixel = (x: number, y: number, currentPixels: string[]) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return undefined;
    return currentPixels[y * size + x];
  };

  const floodFill = (x: number, y: number, targetColor: string, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    
    setPixels(prev => {
      const newPixels = [...prev];
      const stack = [[x, y]];

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const index = cy * size + cx;
        
        if (cx >= 0 && cx < size && cy >= 0 && cy < size && newPixels[index] === targetColor) {
          newPixels[index] = replacementColor;
          stack.push([cx + 1, cy]);
          stack.push([cx - 1, cy]);
          stack.push([cx, cy + 1]);
          stack.push([cx, cy - 1]);
        }
      }
      return newPixels;
    });
  };

  const handlePointerDown = (x: number, y: number) => {
    setIsDrawing(true);
    applyTool(x, y);
  };

  const handlePointerMove = (x: number, y: number) => {
    if (!isDrawing) return;
    if (currentTool === 'fill') return; // Fill shouldn't drag
    applyTool(x, y);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const applyTool = (x: number, y: number) => {
    if (currentTool === 'pencil') {
      setPixel(x, y, currentColor);
    } else if (currentTool === 'eraser') {
      setPixel(x, y, '');
    } else if (currentTool === 'fill') {
      const targetColor = getPixel(x, y, pixels) || '';
      floodFill(x, y, targetColor, currentColor);
    }
  };

  const downloadSprite = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the image pixel by pixel
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = pixels[y * size + x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `sprite-${size}x${size}.png`;
    link.click();
    pushConsoleLog('success', 'SPRITE_STUDIO', `Exported sprite PNG file (${size}x${size})`);
  };

  const saveToProjectAssets = async () => {
    if (!engine) {
      pushConsoleLog('error', 'SPRITE_STUDIO', 'Engine context is not active or loaded.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = pixels[y * size + x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const rnd = Math.floor(Math.random() * 1000);
    const assetId = `sprite_custom_${rnd}`;

    await engine.assets.registerAsset({
      guid: assetId,
      name: `Custom_${size}x${size}_${rnd}`,
      type: 'image',
      sourceUrl: dataUrl,
      dependencies: [],
      version: 1,
      tags: ['sprite', 'custom']
    });

    await engine.assets.loadAsset(assetId);
    
    // Dispatch events to reload visual caches of tilesets or animation lists
    retroEventBus.emit('asset-added', assetId);
    pushConsoleLog('success', 'SPRITE_STUDIO', `Saved custom sprite directly to Assets as /${assetId}`);
  };

  return (
    <div className="flex w-full h-full bg-neutral-950 text-neutral-300 font-sans relative" onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      
      {/* Inline Modal Custom Confirmation Warning Zone */}
      {confirmAction && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-rose-400">Confirm Action</h4>
            <div className="text-xs text-neutral-300 font-medium leading-relaxed">{confirmAction.message}</div>
            <div className="flex justify-end space-x-2 text-[10px] font-bold uppercase leading-none">
              <button 
                onClick={() => setConfirmAction(null)} 
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }} 
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar Toolbar */}
      <div className="w-16 border-r border-neutral-800 bg-neutral-900 flex flex-col items-center py-4 space-y-4 shrink-0">
        <ToolButton 
          icon={<PenTool />} 
          active={currentTool === 'pencil'} 
          onClick={() => setCurrentTool('pencil')} 
          label="Pencil" 
        />
        <ToolButton 
          icon={<Eraser />} 
          active={currentTool === 'eraser'} 
          onClick={() => setCurrentTool('eraser')} 
          label="Eraser" 
        />
        <ToolButton 
          icon={<PaintBucket />} 
          active={currentTool === 'fill'} 
          onClick={() => setCurrentTool('fill')} 
          label="Fill" 
        />

        <div className="w-10 h-px bg-neutral-800 my-2" />
        
        <ToolButton 
          icon={<Trash2 />} 
          onClick={() => {
            setConfirmAction({
              message: 'Clear your entire sprite grid? This cannot be undone.',
              onConfirm: () => setPixels(Array(size * size).fill(''))
            });
          }} 
          label="Clear" 
        />

        <div className="w-10 h-px bg-neutral-800 my-2" />
        
        <div className="flex flex-col gap-1 items-center">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Grid</span>
            <button 
                onClick={() => {
                  if (size !== 16) {
                    setConfirmAction({
                      message: 'Resizing will discard your current sprite. Do you wish to proceed?',
                      onConfirm: () => setSize(16)
                    });
                  }
                }} 
                className={`text-[10px] font-mono font-bold w-9 py-1 rounded transition-colors ${size === 16 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/10' : 'text-neutral-400 hover:bg-neutral-800'}`}
            >
                16px
            </button>
            <button 
                onClick={() => {
                  if (size !== 32) {
                    setConfirmAction({
                      message: 'Resizing will discard your current sprite. Do you wish to proceed?',
                      onConfirm: () => setSize(32)
                    });
                  }
                }} 
                className={`text-[10px] font-mono font-bold w-9 py-1 rounded transition-colors ${size === 32 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/10' : 'text-neutral-400 hover:bg-neutral-800'}`}
            >
                32px
            </button>
        </div>
      </div>

      {/* Main Drawing Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-950">
        
        {/* Top Controls */}
        <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900 shrink-0">
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2">
                 <button onClick={() => setZoom(z => Math.min(z + 0.5, 4))} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors">
                     <ZoomIn className="w-4 h-4" />
                 </button>
                 <span className="text-xs font-mono w-10 text-center text-neutral-400">{(zoom * 100).toFixed(0)}%</span>
                 <button onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors">
                     <ZoomOut className="w-4 h-4" />
                 </button>
             </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={saveToProjectAssets}
              disabled={!engine}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-emerald-400 text-xs font-semibold rounded-md transition-colors"
              title="Save custom canvas to asset scanner list directly"
            >
              <Save className="w-3.5 h-3.5 text-emerald-500" />
              <span>Register Asset</span>
            </button>

            <button 
              onClick={downloadSprite}
              className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </button>
          </div>
        </div>

        {/* Canvas container */}
        <div className="flex-1 flex items-center justify-center overflow-auto custom-scrollbar relative p-8">
            <div 
                className="relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKhu/z//3/qYGRkwCQXo0mQ1H5GEG/jGk4AE9gR1845wGkAAAAASUVORK5CYII=')] shadow-2xl"
                style={{ 
                    width: size * 20 * zoom, 
                    height: size * 20 * zoom, 
                    boxShadow: '0 0 0 1px #262626, 0 10px 40px -10px rgba(0,0,0,0.8)',
                    imageRendering: 'pixelated'
                }}
            >
                {/* SVG Grid Overlay & Interaction */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none' }}
                >
                    {/* Render existing pixels */}
                    {pixels.map((color, idx) => {
                        if (!color) return null;
                        const x = idx % size;
                        const y = Math.floor(idx / size);
                        return <rect key={idx} x={x} y={y} width="1" height="1" fill={color} />;
                    })}

                    {/* Paintable logical grid (transparent cells for hit detection) */}
                    {Array.from({ length: size * size }).map((_, idx) => {
                        const x = idx % size;
                        const y = Math.floor(idx / size);
                        return (
                            <rect
                                key={idx}
                                x={x}
                                y={y}
                                width="1"
                                height="1"
                                fill="transparent"
                                stroke="rgba(255,255,255,0.04)"
                                strokeWidth={1 / (20 * zoom)}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    handlePointerDown(x, y);
                                }}
                                onPointerMove={() => {
                                    handlePointerMove(x, y);
                                }}
                            />
                        );
                    })}
                </svg>
            </div>
        </div>
      </div>

      {/* Right Sidebar Inspector (Palette) */}
      <div className="w-64 border-l border-neutral-800 bg-neutral-900 p-4 shrink-0 overflow-y-auto">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Palette</h3>

        {/* Current Color Indicator */}
        <div className="flex items-center space-x-3 mb-6 p-2 bg-neutral-950 rounded-lg border border-neutral-800">
            <div 
                className="w-10 h-10 rounded border border-neutral-750 shadow-inner" 
                style={{ backgroundColor: currentColor }} 
            />
            <div className="flex-1">
                <input 
                    type="text" 
                    value={currentColor} 
                    onChange={(e) => setCurrentColor(e.target.value)} 
                    className="w-full bg-transparent text-xs font-mono text-neutral-300 outline-none uppercase"
                />
            </div>
            <input 
               type="color" 
               value={currentColor} 
               onChange={(e) => setCurrentColor(e.target.value)}
               className="w-8 h-8 cursor-pointer rounded overflow-hidden"
               style={{ padding: 0, border: 'none', background: 'transparent' }}
            />
        </div>

        <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Swatches</h4>
        <div className="grid grid-cols-4 gap-2 mb-6">
            {palette.map((color, idx) => (
                <button
                    key={idx}
                    onClick={() => setCurrentColor(color)}
                    className={`w-full aspect-square rounded border transition-all ${currentColor === color ? 'border-white scale-110 shadow-lg z-10' : 'border-neutral-750 hover:border-neutral-600'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                />
            ))}
        </div>

        {/* Preview Panel */}
        <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Preview</h4>
        <div className="flex justify-center p-4 bg-neutral-950 rounded-lg border border-neutral-800 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKhu/z//3/qYGRkwCQXo0mQ1H5GEG/jGk4AE9gR1845wGkAAAAASUVORK5CYII=')]">
            <div 
                className="relative"
                style={{ 
                    width: size * 2, // 2x preview
                    height: size * 2, 
                    imageRendering: 'pixelated'
                }}
            >
                <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
                    {pixels.map((color, idx) => {
                        if (!color) return null;
                        const x = idx % size;
                        const y = Math.floor(idx / size);
                        return <rect key={`prev-${idx}`} x={x} y={y} width="1" height="1" fill={color} />;
                    })}
                </svg>
            </div>
        </div>
        <div className="text-center mt-2 text-[10px] text-neutral-500 font-mono">Actual Size: {size}x{size}px</div>

      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick, label }: { icon: React.ReactNode, active?: boolean, onClick: () => void, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`p-2 rounded-xl transition-all group relative flex items-center justify-center ${active ? 'bg-indigo-500/20 text-indigo-405' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
            title={label}
        >
            <div className={`[&>svg]:w-5 [&>svg]:h-5 ${active ? '[&>svg]:drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''}`}>
               {icon}
            </div>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-2 py-1 bg-neutral-800 text-[10px] text-neutral-200 uppercase font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {label}
            </div>
        </button>
    )
}
