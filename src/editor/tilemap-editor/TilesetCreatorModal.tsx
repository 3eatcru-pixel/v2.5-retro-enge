import { useState } from 'react';
import { useEngineStore } from '../../state/engine.store';
import { useAssetStore } from '../../state/asset.store';
import { Tileset } from '../../core/resources/Tileset';
import { X, Search } from 'lucide-react';
import { pushConsoleLog } from '../console-panel/ConsolePanel';

function isCrossOrigin(url: string): boolean {
  if (!url) return false;
  try {
    if (typeof window === 'undefined') return false;
    const origin = window.location.origin;
    const parsed = new URL(url, window.location.href);
    return parsed.origin !== origin;
  } catch (e) {
    return false;
  }
}

export function TilesetCreatorModal({ onClose }: { onClose: () => void }) {
  const engine = useEngineStore(s => s.engine);
  const addTileset = useAssetStore(s => s.addTileset);
  const setActiveTilesetId = useAssetStore(s => s.setActiveTilesetId);

  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [tileSize, setTileSize] = useState<number>(32);
  const [name, setName] = useState<string>('New Tileset');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!engine) return null;

  const imageAssets = engine.assets.getAllAssets().filter((a: any) => 
    a.metadata.type === 'image' && 
    a.metadata.guid.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!selectedAssetId) return;

    const asset = engine.assets.getAllAssets().find((a: any) => a.metadata.guid === selectedAssetId);
    if (!asset) return;

    setIsProcessing(true);

    const cleanSrc = engine.assets.getAssetUrl(asset.metadata.guid) || asset.metadata.sourceUrl;
    
    const img = new Image();
    if (cleanSrc && isCrossOrigin(cleanSrc)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const imgWidth = img.width;
      const imgHeight = img.height;

      const cols = Math.floor(imgWidth / tileSize);
      const rows = Math.floor(imgHeight / tileSize);

      const newTileset: Tileset = {
        id: `tileset_${Date.now()}`,
        name: name || 'Custom Tileset',
        colorTheme: 'indigo',
        imageSrc: cleanSrc,
        tileWidth: tileSize,
        tileHeight: tileSize,
        tiles: []
      };

      let tileIdOffset = 100; // start custom IDs high to avoid collision with standard generic ones
      
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          newTileset.tiles.push({
            id: ++tileIdOffset,
            name: `Tile ${x}, ${y}`,
            color: `hsl(${200 + (x * 10)}, 40%, 40%)`,
            isSolid: false,
            label: `Grid ${x},${y}`,
            desc: 'Auto-sliced tile',
            u: x,
            v: y
          });
        }
      }

      addTileset(newTileset);
      setActiveTilesetId(newTileset.id);
      setIsProcessing(false);
      pushConsoleLog('success', 'TILESET', `Extracted ${newTileset.tiles.length} tiles from sprite sheet.`);
      onClose();
    };
    img.onerror = () => {
      setIsProcessing(false);
      pushConsoleLog('error', 'TILESET', 'Failed to load image for extraction.');
    };
    img.src = cleanSrc;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
       <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-[500px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/50">
             <h2 className="text-sm font-bold text-neutral-200">Import Tileset Image</h2>
             <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-neutral-200"><X className="w-4 h-4"/></button>
          </div>

          <div className="p-4 space-y-4">
            <div>
               <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Tileset Name</label>
               <input type="text" className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-neutral-200 outline-none focus:border-indigo-500" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dungeon Tileset" />
            </div>

            <div>
               <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Select Image Asset</label>
               <div className="flex items-center space-x-2 bg-neutral-950 border border-neutral-800 rounded px-2">
                  <Search className="w-4 h-4 text-neutral-500" />
                  <input type="text" className="bg-transparent border-none w-full p-1.5 text-xs text-neutral-200 outline-none" placeholder="Search by name or folder..." value={search} onChange={e => setSearch(e.target.value)} />
               </div>
               <div className="h-40 overflow-y-auto mt-2 bg-neutral-950 rounded border border-neutral-800 custom-scrollbar p-1">
                  {imageAssets.map((asset: any) => (
                     <div 
                       key={asset.metadata.guid}
                       onClick={() => setSelectedAssetId(asset.metadata.guid)}
                       className={`flex items-center space-x-2 p-1.5 rounded cursor-pointer text-xs transition-colors ${selectedAssetId === asset.metadata.guid ? 'bg-indigo-600 border border-indigo-400 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}
                     >
                        <img src={engine?.assets?.getAssetUrl(asset.metadata.guid) || asset.metadata.sourceUrl} className="w-6 h-6 object-contain bg-black/50 rounded" />
                        <span className="truncate">{asset.metadata.guid}</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Tile Dimensions (px)</label>
                  <input type="number" className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-neutral-200 outline-none focus:border-indigo-500" value={tileSize} onChange={e => setTileSize(e.target.valueAsNumber)} />
                </div>
            </div>
          </div>

          <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 flex justify-end">
             <button onClick={handleCreate} disabled={!selectedAssetId || isProcessing} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold uppercase rounded transition-colors">
                {isProcessing ? 'Processing...' : 'Extract Tileset'}
             </button>
          </div>
       </div>
    </div>
  );
}
