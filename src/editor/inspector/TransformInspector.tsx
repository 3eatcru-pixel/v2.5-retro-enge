import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export function TransformInspector({ compData, updateValue }: { compData: any, updateValue: (key: string, val: any) => void }) {
  const [localX, setLocalX] = useState(compData.x?.toString() || "0");
  const [localY, setLocalY] = useState(compData.y?.toString() || "0");
  const [localRot, setLocalRot] = useState(compData.rotation?.toString() || "0");
  const [localScaleX, setLocalScaleX] = useState(compData.scaleX?.toString() || "1");
  const [localScaleY, setLocalScaleY] = useState(compData.scaleY?.toString() || "1");

  useEffect(() => {
    setLocalX(compData.x?.toString() || "0");
  }, [compData.x]);

  useEffect(() => {
    setLocalY(compData.y?.toString() || "0");
  }, [compData.y]);

  useEffect(() => {
    setLocalRot(compData.rotation?.toString() || "0");
  }, [compData.rotation]);

  useEffect(() => {
    setLocalScaleX(compData.scaleX?.toString() || "1");
  }, [compData.scaleX]);

  useEffect(() => {
    setLocalScaleY(compData.scaleY?.toString() || "1");
  }, [compData.scaleY]);

  const commitValue = (key: string, raw: string) => {
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      updateValue(key, val);
    }
  };

  const handleResetPosition = () => {
    updateValue('x', 0);
    updateValue('y', 0);
    setLocalX("0");
    setLocalY("0");
  };

  const handleResetRotation = () => {
    updateValue('rotation', 0);
    setLocalRot("0");
  };

  const handleResetScale = () => {
    updateValue('scaleX', 1);
    updateValue('scaleY', 1);
    setLocalScaleX("1");
    setLocalScaleY("1");
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Position Row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] uppercase font-black text-neutral-500 tracking-wider">
          <span>Position (coordinates x/y)</span>
          <button 
            type="button"
            onClick={handleResetPosition}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-800 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer text-[8px] font-bold"
            title="Reset Position to (0, 0)"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <span className="text-[9px] font-bold bg-neutral-900 border-r border-neutral-800 text-indigo-400 w-5 h-7 flex items-center justify-center font-mono">X</span>
            <input 
              type="text" 
              value={localX} 
              onChange={e => setLocalX(e.target.value)}
              onBlur={() => commitValue('x', localX)}
              onKeyDown={e => e.key === 'Enter' && commitValue('x', localX)}
              className="w-full bg-transparent text-right text-xs font-mono text-neutral-100 outline-none pr-2.5 h-7" 
            />
          </div>
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <span className="text-[9px] font-bold bg-neutral-900 border-r border-neutral-800 text-teal-400 w-5 h-7 flex items-center justify-center font-mono">Y</span>
            <input 
              type="text" 
              value={localY} 
              onChange={e => setLocalY(e.target.value)}
              onBlur={() => commitValue('y', localY)}
              onKeyDown={e => e.key === 'Enter' && commitValue('y', localY)}
              className="w-full bg-transparent text-right text-xs font-mono text-neutral-100 outline-none pr-2.5 h-7" 
            />
          </div>
        </div>
      </div>

      {/* Rotation Row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] uppercase font-black text-neutral-500 tracking-wider">
          <span>Rotation (degrees)</span>
          <button 
            type="button"
            onClick={handleResetRotation}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-800 text-amber-500 hover:text-amber-400 transition-colors cursor-pointer text-[8px] font-bold"
            title="Reset Rotation to 0°"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>
        <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
          <span className="text-[9px] font-bold bg-neutral-900 border-r border-neutral-800 text-amber-500 w-5 h-7 flex items-center justify-center font-mono">°</span>
          <input 
            type="text" 
            value={localRot} 
            onChange={e => setLocalRot(e.target.value)}
            onBlur={() => commitValue('rotation', localRot)}
            onKeyDown={e => e.key === 'Enter' && commitValue('rotation', localRot)}
            className="bg-transparent text-xs font-mono text-neutral-100 outline-none px-2.5 h-7 flex-1 min-w-0" 
          />
          <input 
            type="range"
            min={-360}
            max={360}
            value={Math.round(compData.rotation || 0)}
            onChange={e => {
              const val = parseInt(e.target.value) || 0;
              updateValue('rotation', val);
              setLocalRot(val.toString());
            }}
            className="w-24 h-1.5 bg-neutral-800 rounded-lg mr-2 select-none accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Scale Row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] uppercase font-black text-neutral-500 tracking-wider">
          <span>Scale factor</span>
          <button 
            type="button"
            onClick={handleResetScale}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-800 text-emerald-400 hover:text-emerald-350 transition-colors cursor-pointer text-[8px] font-bold"
            title="Reset Scale to (1.0, 1.0)"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <span className="text-[9px] font-bold bg-neutral-900 border-r border-neutral-800 text-emerald-400 w-5 h-7 flex items-center justify-center font-mono">W</span>
            <input 
              type="text" 
              value={localScaleX} 
              onChange={e => setLocalScaleX(e.target.value)}
              onBlur={() => commitValue('scaleX', localScaleX)}
              onKeyDown={e => e.key === 'Enter' && commitValue('scaleX', localScaleX)}
              className="w-full bg-transparent text-right text-xs font-mono text-neutral-100 outline-none pr-2.5 h-7" 
            />
          </div>
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <span className="text-[9px] font-bold bg-neutral-900 border-r border-neutral-800 text-cyan-400 w-5 h-7 flex items-center justify-center font-mono">H</span>
            <input 
              type="text" 
              value={localScaleY} 
              onChange={e => setLocalScaleY(e.target.value)}
              onBlur={() => commitValue('scaleY', localScaleY)}
              onKeyDown={e => e.key === 'Enter' && commitValue('scaleY', localScaleY)}
              className="w-full bg-transparent text-right text-xs font-mono text-neutral-100 outline-none pr-2.5 h-7" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
