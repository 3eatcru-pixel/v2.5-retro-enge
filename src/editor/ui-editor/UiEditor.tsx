import { MousePointer2, Type, Square, LayoutTemplate, Trash2, Battery, MessageSquare, Maximize2, ZoomIn, ZoomOut, Sliders } from 'lucide-react';
import { useState, useRef } from 'react';
import { pushConsoleLog } from '../console-panel/ConsolePanel';

interface UiElement {
  id: string;
  type: 'Panel' | 'Button' | 'Text' | 'ProgressBar' | 'DialogBox';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  value?: number; // for progress bar
}

export function UiEditor() {
  const [elements, setElements] = useState<UiElement[]>([
    { id: 'hud-1', type: 'Panel', x: 20, y: 20, width: 220, height: 60, color: 'bg-neutral-900/80 border-neutral-700' },
    { id: 'hud-text', type: 'Text', x: 30, y: 30, width: 200, height: 20, text: 'PLAYER HP', color: 'text-neutral-100 font-bold font-mono text-sm drop-shadow' },
    { id: 'hud-bar', type: 'ProgressBar', x: 30, y: 55, width: 200, height: 12, value: 75, color: 'bg-emerald-500' },
    { id: 'btn-1', type: 'Button', x: 20, y: 100, width: 140, height: 40, text: 'Action', color: 'bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold uppercase tracking-wider' }
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);
  
  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number, startY: number, initialW: number, initialH: number } | null>(null);

  const selectedElement = elements.find(el => el.id === selectedId);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    const el = elements.find(el => el.id === id);
    if (el) {
      setIsDragging(true);
      dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: el.x, initialY: el.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleResizePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    const el = elements.find(el => el.id === id);
    if (el) {
      setIsResizing(true);
      resizeRef.current = { startX: e.clientX, startY: e.clientY, initialW: el.width, initialH: el.height };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && dragRef.current && selectedId) {
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      setElements(elements.map(el => {
        if (el.id === selectedId) {
          return { 
            ...el, 
            x: Math.round(dragRef.current!.initialX + dx), 
            y: Math.round(dragRef.current!.initialY + dy) 
          };
        }
        return el;
      }));
    } else if (isResizing && resizeRef.current && selectedId) {
      const dx = (e.clientX - resizeRef.current.startX) / zoom;
      const dy = (e.clientY - resizeRef.current.startY) / zoom;
      setElements(elements.map(el => {
        if (el.id === selectedId) {
          return { 
            ...el, 
            width: Math.max(20, Math.round(resizeRef.current!.initialW + dx)), 
            height: Math.max(10, Math.round(resizeRef.current!.initialH + dy)) 
          };
        }
        return el;
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (isResizing) {
      setIsResizing(false);
      resizeRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      pushConsoleLog('info', 'UI_EDITOR', `Resized element ${selectedId}.`);
    }
  };

  const updateSelectedElementValue = (key: keyof UiElement, value: any) => {
    if (!selectedId) return;
    setElements(elements.map(el => {
      if (el.id === selectedId) {
        return { ...el, [key]: value };
      }
      return el;
    }));
  };

  const spawnElement = (type: UiElement['type']) => {
    const newEl: UiElement = {
      id: `ui-${Math.random().toString(36).substring(2, 9)}`,
      type,
      x: 200,
      y: 150,
      width: 200,
      height: 40,
    };

    if (type === 'Text') {
       newEl.width = 120; newEl.height = 30; newEl.text = 'New Text'; newEl.color = 'text-neutral-300 font-sans';
    } else if (type === 'Button') {
       newEl.width = 120; newEl.height = 40; newEl.text = 'Button'; newEl.color = 'bg-neutral-800 text-white hover:bg-neutral-700/60 rounded font-bold uppercase';
    } else if (type === 'Panel') {
       newEl.width = 200; newEl.height = 150; newEl.color = 'bg-neutral-900 border border-neutral-750';
    } else if (type === 'ProgressBar') {
       newEl.width = 200; newEl.height = 20; newEl.value = 50; newEl.color = 'bg-rose-500';
    } else if (type === 'DialogBox') {
       newEl.width = 600; newEl.height = 160; newEl.text = 'Narrator\n\nThis dialogue box overlays cleanly across VN scenes.'; newEl.color = 'bg-black/85 border border-neutral-800 text-white font-serif p-4';
       newEl.x = 100; newEl.y = 400;
    }

    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    pushConsoleLog('success', 'UI_EDITOR', `Spawned new UI ${type}.`);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter(el => el.id !== selectedId));
      pushConsoleLog('warn', 'UI_EDITOR', `Deleted UI Element ${selectedId}.`);
      setSelectedId(null);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 bg-neutral-900 border border-neutral-800 font-sans text-neutral-300">
      
      {/* Header */}
      <div className="h-8 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-3 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center space-x-2">
          <LayoutTemplate className="w-4 h-4 text-emerald-500" />
          <span>UI Canvas Overlay Editor</span>
        </span>
        
        {/* Zoom controls & quick actions inside Header */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 border-r border-neutral-850 pr-2">
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 1.5))} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-neutral-500 w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={deleteSelected} 
            disabled={!selectedId} 
            className="p-1 rounded text-neutral-500 hover:bg-rose-950 hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Delete Selected GUI Element"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor Tools */}
        <div className="w-48 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0">
          <div className="p-3 border-b border-neutral-850 shrink-0">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">UI Toolbox</span>
          </div>
          
          <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
             <button onClick={() => spawnElement('Panel')} className="w-full flex items-center space-x-2 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700/60 rounded-md transition-all text-left text-xs font-semibold text-neutral-400 hover:text-neutral-250">
                <Square className="w-4 h-4 text-amber-500" />
                <span>Panel Box</span>
             </button>
             <button onClick={() => spawnElement('Button')} className="w-full flex items-center space-x-2 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700/60 rounded-md transition-all text-left text-xs font-semibold text-neutral-400 hover:text-neutral-250">
                <MousePointer2 className="w-4 h-4 text-emerald-500" />
                <span>Button</span>
             </button>
             <button onClick={() => spawnElement('Text')} className="w-full flex items-center space-x-2 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700/60 rounded-md transition-all text-left text-xs font-semibold text-neutral-400 hover:text-neutral-250">
                <Type className="w-4 h-4 text-indigo-400" />
                <span>Text Label</span>
             </button>
             <button onClick={() => spawnElement('ProgressBar')} className="w-full flex items-center space-x-2 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700/60 rounded-md transition-all text-left text-xs font-semibold text-neutral-400 hover:text-neutral-250">
                <Battery className="w-4 h-4 text-rose-400" />
                <span>Progress Bar</span>
             </button>
             <button onClick={() => spawnElement('DialogBox')} className="w-full flex items-center space-x-2 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700/60 rounded-md transition-all text-left text-xs font-semibold text-neutral-400 hover:text-neutral-250">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span>VN Dialog Box</span>
             </button>
          </div>

          <div className="p-3 border-t border-neutral-850 bg-neutral-900 text-[10px] text-neutral-500 font-medium">
             Customize values using the Properties Inspector on the right upon selection.
          </div>
        </div>

        {/* Center: Viewport Canvas with responsive size constraint */}
        <div 
           className="flex-1 bg-neutral-950 flex items-center justify-center p-4 relative overflow-auto custom-scrollbar" 
           onClick={() => setSelectedId(null)}
        >
          {/* Virtual Screen Bounds */}
          <div 
             className="bg-neutral-900 relative shadow-2xl ring-1 ring-neutral-800 origin-center select-none"
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onPointerLeave={handlePointerUp}
             style={{
               width: 800,
               height: 600,
               transform: `scale(${zoom})`,
               boxSizing: 'content-box'
             }}
          >
             {/* Dynamic background grid */}
             <div className="absolute inset-0 pointer-events-none grid" style={{
               backgroundSize: '40px 40px',
               backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)'
             }}></div>

             {/* UI Elements Layer */}
             {elements.map(el => (
                <div
                  key={el.id}
                  onPointerDown={(e) => handlePointerDown(el.id, e)}
                  className={`absolute flex items-start justify-start cursor-move transition-shadow ${el.type === 'DialogBox' || el.type === 'Panel' || el.type === 'Button' ? 'border border-neutral-700/40' : ''} ${el.color} ${
                    selectedId === el.id ? 'ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] z-20 shadow-xl' : 'z-10'
                  } ${el.type === 'ProgressBar' ? 'bg-neutral-800 p-1 border border-neutral-750' : ''}`}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    boxSizing: 'border-box'
                  }}
                  title={el.id}
                >
                  {el.type === 'Text' && <span className="block w-full text-center truncate">{el.text}</span>}
                  {el.type === 'Button' && <div className="w-full h-full flex items-center justify-center font-bold tracking-wider truncate">{el.text}</div>}
                  {el.type === 'ProgressBar' && (
                    <div className="w-full h-full bg-neutral-950 p-0.5 rounded overflow-hidden">
                      <div className={`h-full ${el.color} rounded-sm`} style={{ width: `${el.value || 0}%` }} />
                    </div>
                  )}
                  {el.type === 'DialogBox' && (
                    <div className="p-4 w-full h-full whitespace-pre-wrap leading-relaxed text-sm overflow-hidden">{el.text}</div>
                  )}
                  
                  {/* Resize Handle lower-right */}
                  {selectedId === el.id && (
                    <div 
                      className="absolute -right-2 -bottom-2 w-5 h-5 bg-indigo-600 border-2 border-neutral-900 rounded-full cursor-se-resize flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                      onPointerDown={(e) => handleResizePointerDown(el.id, e)}
                    >
                      <Maximize2 className="w-2.5 h-2.5 text-white rotate-90" />
                    </div>
                  )}
                </div>
             ))}

             <div className="absolute bottom-2 right-3 text-[9px] font-mono font-bold text-neutral-600 pointer-events-none tracking-widest uppercase">
                  SCREEN LIMITS: 800 x 600 px
             </div>
          </div>
        </div>

        {/* Right Side: Properties Inspector (matching standard editor layout patterns) */}
        <div className="w-64 border-l border-neutral-800 bg-neutral-900 flex flex-col shrink-0 custom-scrollbar overflow-y-auto">
          <div className="p-3 border-b border-neutral-850 flex items-center justify-between shrink-0">
             <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center space-x-1.5">
               <Sliders className="w-3.5 h-3.5 text-indigo-400" />
               <span>HUD Inspector</span>
             </span>
             {selectedElement && (
               <span className="text-[9px] font-mono text-neutral-500">#{selectedElement.id.substring(3, 7)}</span>
             )}
          </div>

          {selectedElement ? (
             <div className="p-4 space-y-4">
               
               {/* Label & Type Overview */}
               <div>
                 <span className="text-[9px] font-extrabold uppercase text-neutral-500 block leading-none">Element Type</span>
                 <span className="text-sm font-bold text-neutral-200 mt-1 block">{selectedElement.type} Element</span>
               </div>

               {/* ID text field */}
               <div>
                  <label className="text-[9px] font-bold text-neutral-500 uppercase block mb-1">Element Name</label>
                  <input 
                    type="text" 
                    value={selectedElement.id} 
                    onChange={(e) => updateSelectedElementValue('id', e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-indigo-505/50 transition-colors"
                  />
               </div>

               {/* Coordinate Grid inputs */}
               <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[9px] font-bold text-neutral-500 uppercase block mb-1">X Pos (px)</label>
                    <input 
                      type="number" 
                      value={selectedElement.x} 
                      onChange={(e) => updateSelectedElementValue('x', parseInt(e.target.value, 10) || 0)} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-indigo-505/50 transition-colors"
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-neutral-500 uppercase block mb-1">Y Pos (px)</label>
                    <input 
                      type="number" 
                      value={selectedElement.y} 
                      onChange={(e) => updateSelectedElementValue('y', parseInt(e.target.value, 10) || 0)} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-indigo-505/50 transition-colors"
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-neutral-500 uppercase block mb-1">Width (W)</label>
                    <input 
                      type="number" 
                      value={selectedElement.width} 
                      onChange={(e) => updateSelectedElementValue('width', parseInt(e.target.value, 10) || 20)} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-indigo-505/50 transition-colors"
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-neutral-500 uppercase block mb-1">Height (H)</label>
                    <input 
                      type="number" 
                      value={selectedElement.height} 
                      onChange={(e) => updateSelectedElementValue('height', parseInt(e.target.value, 10) || 10)} 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-indigo-505/50 transition-colors"
                    />
                 </div>
               </div>

               {/* Custom text content for text/button labels */}
               {selectedElement.text !== undefined && (
                  <div>
                    <label className="text-[9px] font-bold text-neutral-500 uppercase block mb-1">Label Text</label>
                    {selectedElement.type === 'DialogBox' ? (
                      <textarea
                        value={selectedElement.text} 
                        onChange={(e) => updateSelectedElementValue('text', e.target.value)} 
                        rows={4}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-indigo-505/50 transition-colors resize-none leading-normal"
                      />
                    ) : (
                      <input 
                        type="text" 
                        value={selectedElement.text} 
                        onChange={(e) => updateSelectedElementValue('text', e.target.value)} 
                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-indigo-505/50 transition-colors"
                      />
                    )}
                  </div>
               )}

               {/* ProgressBar fill slider adjustment */}
               {selectedElement.value !== undefined && (
                  <div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-neutral-500 uppercase mb-1">
                      <span>Value / Fill</span>
                      <span className="font-mono text-indigo-400 font-semibold">{selectedElement.value}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={selectedElement.value}
                      onChange={(e) => updateSelectedElementValue('value', parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-505 cursor-pointer"
                    />
                  </div>
               )}

               {/* Style selector class */}
               {selectedElement.color !== undefined && (
                  <div>
                     <label className="text-[9px] font-bold text-neutral-500 uppercase block mb-1">Tailwind Style Classes</label>
                     <input 
                       type="text" 
                       value={selectedElement.color} 
                       onChange={(e) => updateSelectedElementValue('color', e.target.value)} 
                       className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 font-mono outline-none focus:border-indigo-505/50 transition-colors"
                     />
                  </div>
               )}

             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 space-y-2">
                <LayoutTemplate className="w-8 h-8 text-neutral-700/60 stroke-1" />
                <div className="text-xs font-bold leading-none">No Element Selection</div>
                <div className="text-[10px] leading-relaxed">Click any HUD item inside the virtual viewport layout to inspect and customize its variables.</div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
