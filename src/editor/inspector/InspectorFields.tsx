import { useState, useEffect } from 'react';
import { useEngineStore } from '../../state/engine.store';

export function NumberField({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) {
  const [localValue, setLocalValue] = useState(value?.toFixed(2) || "0.00");

  useEffect(() => {
    setLocalValue(value?.toFixed(2) || "0.00");
  }, [value]);

  const handleBlur = () => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
      setLocalValue(parsed.toFixed(2));
    } else {
      setLocalValue(value?.toFixed(2) || "0.00");
    }
  };

  return (
    <div className="flex items-center bg-neutral-900 px-2 py-1.5 rounded border border-neutral-800 focus-within:border-indigo-500/50 focus-within:bg-neutral-800 transition-colors">
      <span className="text-[10px] uppercase font-bold text-neutral-600 w-8 shrink-0 truncate mr-1" title={label}>{label}</span>
      <input 
        type="text"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && handleBlur()}
        className="w-full bg-transparent text-right text-xs font-mono text-neutral-200 outline-none" 
      />
    </div>
  );
}

export function SliderField({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void }) {
  const [localValue, setLocalValue] = useState(value || 0);

  useEffect(() => {
    setLocalValue(value || 0);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    setLocalValue(parsed);
    onChange(parsed);
  };

  return (
    <div className="flex flex-col bg-neutral-900 px-2 py-1.5 rounded border border-neutral-800 transition-colors">
      <div className="flex items-center justify-between pointer-events-none mb-1 text-[10px] uppercase font-bold text-neutral-600">
        <span title={label}>{label}</span>
        <span className="font-mono text-indigo-400">{localValue?.toFixed(2)}</span>
      </div>
      <input 
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleChange}
        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer" 
      />
    </div>
  );
}

export function AssetField({ label, value, assetType, onChange }: { label: string, value: string | null, assetType?: 'image' | 'audio' | 'any', onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const engine = useEngineStore((s) => s.engine);
  const [search, setSearch] = useState('');

  if (!engine) return null;

  const allAssets = engine.assets.getAllAssets().filter(a => {
    if (assetType && assetType !== 'any' && a.metadata.type !== assetType) return false;
    if (search && !a.metadata.guid.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="relative">
      <div 
        className="flex flex-col bg-neutral-900 px-2 py-1.5 rounded border border-neutral-800 transition-colors cursor-pointer hover:border-indigo-500/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[10px] uppercase font-bold text-neutral-600 mb-1">{label}</span>
        <div className="text-[10px] text-neutral-300 truncate font-mono bg-neutral-950 p-1 rounded border border-neutral-800 pointer-events-none">
          {value || 'None selected'}
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 z-50 bg-neutral-900 border border-neutral-700 rounded shadow-2xl p-2 h-48 flex flex-col">
          <input 
             autoFocus
             type="text" 
             className="w-full bg-neutral-950 border border-neutral-800 p-1.5 text-xs text-neutral-200 outline-none rounded mb-2 font-mono" 
             placeholder="Search assets..." 
             value={search}
             onChange={e => setSearch(e.target.value)}
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
             <div 
               className="p-1.5 text-[10px] text-neutral-400 hover:bg-neutral-800 rounded cursor-pointer transition-colors"
               onClick={() => { onChange(''); setIsOpen(false); }}
             >
               ( None )
             </div>
             {allAssets.map(a => (
               <div 
                 key={a.metadata.guid}
                 className="flex flex-col space-y-1 p-1.5 hover:bg-indigo-600/20 rounded cursor-pointer transition-colors"
                 onClick={() => {
                    onChange(a.metadata.guid);
                    setIsOpen(false);
                 }}
                 title={a.metadata.guid}
               >
                 <div className="flex items-center space-x-2">
                   {a.metadata.type === 'image' && <img src={engine?.assets?.getAssetUrl(a.metadata.guid) || a.metadata.sourceUrl} className="w-6 h-6 object-contain shrink-0 bg-black/50 rounded" />}
                   <span className="truncate text-[10px] font-mono text-neutral-300 leading-tight">{a.metadata.guid}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}
      
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
}
