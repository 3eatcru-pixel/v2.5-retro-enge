import { useState, useId } from 'react';
import { Plus, Trash2, Cpu } from 'lucide-react';
import { TilemapObject } from '../../core/ecs/components/Tilemap';

interface ObjectInspectorProps {
  selectedObjectId: string | null;
  objects: TilemapObject[];
  setSelectedObjectId: (id: string | null) => void;
  getTilemapComponent: () => any;
  forceUpdate: () => void;
  recordHistory: () => void;
  addLog: (module: string, text: string, type?: 'info' | 'warn' | 'success' | 'error') => void;
}

export function ObjectInspector({
  selectedObjectId,
  objects,
  setSelectedObjectId,
  getTilemapComponent,
  forceUpdate,
  recordHistory,
  addLog
}: ObjectInspectorProps) {
  const compId0 = useId();
  const activeObj = objects.find(o => o.id === selectedObjectId);

  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  const handleUpdateProp = (field: string, val: any) => {
    if (!activeObj) return;
    recordHistory();
    (activeObj as any)[field] = val;
    forceUpdate();
  };

  const handleCreateCustomProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeObj || !customKey.trim()) return;

    recordHistory();
    if (!activeObj.properties) {
      activeObj.properties = {};
    }
    activeObj.properties[customKey.trim()] = customValue;
    setCustomKey('');
    setCustomValue('');
    forceUpdate();
    addLog('OBJECT_SYS', `Added custom parameter "${customKey}" to object: ${activeObj.name}`);
  };

  const handleRemoveCustomProperty = (key: string) => {
    if (!activeObj || !activeObj.properties) return;
    recordHistory();
    delete activeObj.properties[key];
    forceUpdate();
    addLog('OBJECT_SYS', `Removed parameter "${key}" from object.`);
  };

  const handleDeleteObject = () => {
    if (!selectedObjectId) return;
    const comp = getTilemapComponent();
    if (comp && comp.objects) {
      recordHistory();
      comp.objects = comp.objects.filter((o: TilemapObject) => o.id !== selectedObjectId);
      setSelectedObjectId(null);
      forceUpdate();
      addLog('OBJECT_SYS', '🗑 Removed selected indicator from coordinate matrix.', 'warn');
    }
  };

  return (
    <div id={`object-inspector-${compId0}`} className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-md text-xs text-neutral-300">
      <div className="flex items-center space-x-1.5 border-b border-neutral-850 pb-1.5">
        <Cpu className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        <span className="text-[10px] uppercase font-bold text-neutral-350 tracking-wider">Placed Indicator Inspector</span>
      </div>

      {activeObj ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-neutral-950 p-1.5 px-2 rounded border border-neutral-850 font-mono text-[9px]">
            <span className="text-neutral-500 font-bold uppercase">ID:</span>
            <span className="text-amber-450 truncate max-w-[150px]" title={activeObj.id}>
              {activeObj.id}
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Human Name</label>
              <input
                type="text"
                value={activeObj.name}
                onChange={e => handleUpdateProp('name', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500 text-neutral-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Grid X</label>
                <input
                  type="number"
                  value={activeObj.gridX}
                  onChange={e => handleUpdateProp('gridX', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500 text-neutral-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Grid Y</label>
                <input
                  type="number"
                  value={activeObj.gridY}
                  onChange={e => handleUpdateProp('gridY', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500 text-neutral-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Object Type Category</label>
              <select
                value={activeObj.type}
                onChange={e => handleUpdateProp('type', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-850 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-neutral-300 text-xs cursor-pointer"
              >
                <option value="player">👤 HERO PLAYER</option>
                <option value="enemy">👾 SLIME GUARD</option>
                <option value="coin">🪙 GOLD COIN</option>
                <option value="chest">📦 TREASURE CHEST</option>
                <option value="key">🔑 GATE KEY</option>
                <option value="camera">🎥 SCREEN CAMERA</option>
              </select>
            </div>
          </div>

          {/* Custom properties key-value tags list */}
          <div className="space-y-1 pt-2 border-t border-neutral-800">
            <span className="text-[9px] uppercase font-bold text-neutral-550 block mb-1">Custom Attributes Payload</span>
            
            {activeObj.properties && Object.keys(activeObj.properties).length > 0 ? (
              <div className="space-y-1 bg-neutral-950 p-1.5 rounded border border-neutral-850 max-h-24 overflow-y-auto">
                {Object.entries(activeObj.properties).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-[10px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                    <span className="text-neutral-450 truncate max-w-[90px]">{k}:</span>
                    <span className="text-indigo-300 truncate max-w-[90px] font-bold">{String(v)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomProperty(k)}
                      className="text-neutral-500 hover:text-rose-400 p-0.5 ml-1 transition-colors shrink-0"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[9.5px] text-neutral-550 italic block text-center bg-neutral-950/40 p-1 rounded">No metadata keys attached.</span>
            )}

            <form onSubmit={handleCreateCustomProperty} className="grid grid-cols-5 gap-1.5 pt-2">
              <input
                type="text"
                placeholder="Key"
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                className="col-span-2 bg-neutral-950 border border-neutral-850 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-indigo-500 text-neutral-300 font-mono"
              />
              <input
                type="text"
                placeholder="Value"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                className="col-span-2 bg-neutral-950 border border-neutral-850 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-indigo-500 text-neutral-300 font-mono"
              />
              <button
                type="submit"
                className="col-span-1 bg-neutral-800 hover:bg-neutral-700 text-indigo-300 rounded flex items-center justify-center p-1 transition-colors cursor-pointer"
                title="Add Property"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={handleDeleteObject}
            className="w-full py-1.5 px-2 border border-rose-500/10 hover:border-rose-500/50 bg-rose-950/5 hover:bg-rose-950/20 text-rose-350 hover:text-white transition-all font-bold text-[9.5px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-455" />
            <span>Delete Selected Placed Element</span>
          </button>
        </div>
      ) : (
        <div className="text-center py-5 border border-dashed border-neutral-800 text-neutral-550 leading-relaxed font-sans flex flex-col justify-center items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Inspector empty</span>
          <p className="text-[9.5px] max-w-[180px] mt-0.5">Select "Collision" layer and select placed objects with "Select Arrow" tool on the painting canvas to edit variables.</p>
        </div>
      )}
    </div>
  );
}
