import { useId } from 'react';
import { Layers, Plus, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { TilemapLayer } from '../../core/ecs/components/Tilemap';

interface LayerManagerProps {
  layers: TilemapLayer[];
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  getTilemapComponent: () => any;
  forceUpdate: () => void;
  recordHistory: () => void;
  addLog: (module: string, text: string, type?: 'info' | 'warn' | 'success' | 'error') => void;
}

export function LayerManager({
  layers,
  activeLayerId,
  setActiveLayerId,
  getTilemapComponent,
  forceUpdate,
  recordHistory,
  addLog
}: LayerManagerProps) {
  const panelId = useId();

  const handleCreateLayer = () => {
    const comp = getTilemapComponent();
    if (comp && comp.layers) {
      recordHistory();
      const codeSuffix = Math.floor(100 + Math.random() * 899);
      const nextId = `layer-custom-${codeSuffix}`;
      const l: TilemapLayer = {
        id: nextId,
        name: `Custom Layer ${comp.layers.length}`,
        tiles: new Array(comp.width * comp.height).fill(0),
        visible: true,
        opacity: 1,
        locked: false,
        type: 'tile'
      };
      comp.layers.splice(comp.layers.length - 1, 0, l); // insert right before physical collision layer
      setActiveLayerId(nextId);
      forceUpdate();
      addLog('LAYER_MGR', `✓ Injected custom painting Layer: "${l.name}"`, 'success');
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layerId === 'layer-ground' || layerId === 'layer-collision') {
      addLog('LAYER_MGR', 'Cannot delete essential core system layers.', 'error');
      return;
    }
    const comp = getTilemapComponent();
    if (comp && comp.layers) {
      recordHistory();
      comp.layers = comp.layers.filter((l: TilemapLayer) => l.id !== layerId);
      if (activeLayerId === layerId) {
        setActiveLayerId('layer-ground');
      }
      forceUpdate();
      addLog('LAYER_MGR', `🗑 Removed custom painting layer: "${layerId}"`, 'warn');
    }
  };

  return (
    <div id={`layer-manager-suite-${panelId}`} className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3.5 shadow-md">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Layers Suite</span>
        </span>
        <button
          onClick={handleCreateLayer}
          className="text-[9px] bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-100 hover:text-white px-2 py-0.5 rounded-md flex items-center gap-1 font-bold uppercase transition-all shadow shadow-indigo-600/10 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Add Layer</span>
        </button>
      </div>

      <div className="space-y-1 bg-neutral-950 p-1 rounded-xl border border-neutral-850 max-h-48 overflow-y-auto custom-scrollbar">
        {layers.map((layer, idx) => {
          const active = activeLayerId === layer.id;

          const handleToggleVisible = (e: React.MouseEvent) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            forceUpdate();
          };

          const handleToggleLock = (e: React.MouseEvent) => {
            e.stopPropagation();
            layer.locked = !layer.locked;
            forceUpdate();
          };

          const handleMoveUp = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (idx > 0) {
              recordHistory();
              const comp = getTilemapComponent();
              if (comp) {
                const temp = comp.layers[idx];
                comp.layers[idx] = comp.layers[idx - 1];
                comp.layers[idx - 1] = temp;
                forceUpdate();
              }
            }
          };

          const handleMoveDown = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (idx < layers.length - 1) {
              recordHistory();
              const comp = getTilemapComponent();
              if (comp) {
                const temp = comp.layers[idx];
                comp.layers[idx] = comp.layers[idx + 1];
                comp.layers[idx + 1] = temp;
                forceUpdate();
              }
            }
          };

          return (
            <div
              key={layer.id}
              onClick={() => {
                setActiveLayerId(layer.id);
                addLog('LAYER_MGR', `Active canvas layer changed to: "${layer.name}"`, 'info');
              }}
              className={`p-2 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer border ${
                active
                  ? 'bg-indigo-950/20 border-indigo-505/40 text-indigo-300'
                  : 'hover:bg-neutral-900 border-transparent hover:border-neutral-800'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    layer.type === 'collision' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                ></span>
                <span className={`font-semibold truncate ${active ? 'text-neutral-100' : 'text-neutral-400'}`}>
                  {layer.name}
                </span>
                {layer.type === 'collision' && (
                  <span className="text-[7.5px] bg-rose-950/45 text-rose-400 px-1 rounded border border-rose-900/40 select-none">
                    COLLIDERS
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1 ml-2">
                <button
                  type="button"
                  onClick={handleToggleVisible}
                  className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors"
                  title="Toggle Visibility"
                >
                  {layer.visible ? (
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-neutral-600" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors"
                  title="Toggle Edit Lock"
                >
                  {layer.locked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-neutral-600" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleMoveUp}
                  disabled={idx === 0}
                  className="p-1 text-neutral-600 hover:text-neutral-300 disabled:opacity-30 disabled:pointer-events-none"
                  title="Send Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleMoveDown}
                  disabled={idx === layers.length - 1}
                  className="p-1 text-neutral-600 hover:text-neutral-300 disabled:opacity-30 disabled:pointer-events-none"
                  title="Send Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                {layer.id !== 'layer-ground' && layer.id !== 'layer-collision' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    className="p-1 text-neutral-600 hover:text-rose-400 transition-colors"
                    title="Delete Custom Layer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
