import { ArrowUp, ArrowDown, Plus, LayoutGrid, Info, Layers } from 'lucide-react';
import { Tileset } from '../../core/resources/Tileset';

interface SplicerWorkspaceProps {
  activeTileset: Tileset;
  tileWidth: number;
  tileHeight: number;
  calculatedCols: number;
  calculatedRows: number;
  spritesheetSrc: string | null;
  splicingSelectedCell: { u: number; v: number } | null;
  newTileName: string;
  setNewTileName: (v: string) => void;
  newTileLabel: string;
  setNewTileLabel: (v: string) => void;
  newTileIsSolid: boolean;
  setNewTileIsSolid: (v: boolean) => void;
  newTileDesc: string;
  setNewTileDesc: (v: string) => void;
  
  // Custom functions
  makeBase64Slice: (u: number, v: number) => string | undefined;
  handleSplicerCellClick: (u: number, v: number) => void;
  handleAddSlicingTile: (e: React.FormEvent) => void;
  handleAutoExtractAll: () => void;
  handleRemoveTile: (id: number) => void;

  // JSON Imports
  isImportOpen: boolean;
  setIsImportOpen: (open: boolean) => void;
  importJsonText: string;
  setImportJsonText: (v: string) => void;
  importError: string | null;
  handleImportJsonText: () => void;

  // Ref hooks
  spritesheetInputRef: React.RefObject<HTMLInputElement>;
  splicerImageRef: React.RefObject<HTMLImageElement>;
}

export function SplicerWorkspace({
  activeTileset,
  tileWidth,
  tileHeight,
  calculatedCols,
  calculatedRows,
  spritesheetSrc,
  splicingSelectedCell,
  newTileName,
  setNewTileName,
  newTileLabel,
  setNewTileLabel,
  newTileIsSolid,
  setNewTileIsSolid,
  newTileDesc,
  setNewTileDesc,
  
  makeBase64Slice,
  handleSplicerCellClick,
  handleAddSlicingTile,
  handleAutoExtractAll,
  handleRemoveTile,

  isImportOpen,
  setIsImportOpen,
  importJsonText,
  setImportJsonText,
  importError,
  handleImportJsonText,

  spritesheetInputRef,
  splicerImageRef
}: SplicerWorkspaceProps) {

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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/90 overflow-y-auto custom-scrollbar p-6 space-y-6 border-r border-neutral-800 h-full scrollbar-none">
      
      {/* JSON parsing dialog panels portal */}
      {isImportOpen && (
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3 max-w-2xl shadow-xl">
          <div className="flex justify-between items-center bg-neutral-950 p-2 rounded">
            <span className="text-xs font-black uppercase tracking-wider text-amber-455 font-sans flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Import Tileset Config JSON Schema</span>
            </span>
            <button type="button" onClick={() => setIsImportOpen(false)} className="text-xs text-neutral-500 hover:text-neutral-300">Close</button>
          </div>
          <textarea 
            value={importJsonText}
            onChange={e => setImportJsonText(e.target.value)}
            placeholder="Paste raw matching elements coordinates configuration JSON payload..."
            className="w-full h-32 bg-neutral-950 border border-neutral-850 rounded p-2 text-[10.5px] font-mono text-neutral-350 focus:outline-none focus:border-indigo-500"
          />
          {importError && <p className="text-xs text-rose-400 font-semibold">{importError}</p>}
          <button 
            type="button"
            onClick={handleImportJsonText}
            className="w-full bg-indigo-650 hover:bg-indigo-600 text-indigo-50 font-bold py-1.5 rounded text-xs cursor-pointer transition-colors"
          >
            Load and Sync Configurations
          </button>
        </div>
      )}

      {spritesheetSrc ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-xl text-xs">
            <span className="font-bold text-neutral-350 uppercase tracking-widest text-[10px]">CROP & SLICE WORKBENCH</span>
            <div className="flex items-center space-x-2">
              <button 
                type="button"
                onClick={handleAutoExtractAll}
                className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
              >
                ⚡ Auto-Extract All Grid Cells
              </button>
              <span className="text-neutral-700">|</span>
              <span className="font-mono text-[10px] text-neutral-450">Current size: {tileWidth}x{tileHeight}px</span>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 items-start">
            
            {/* Direct Image interactive grid overlays wrapper */}
            <div className="relative border border-neutral-800 bg-neutral-900 p-2.5 rounded-2xl max-w-full overflow-auto max-h-[480px]">
              <div className="relative inline-block select-none">
                <img 
                  ref={splicerImageRef}
                  src={spritesheetSrc} 
                  alt="loaded sheets preview" 
                  className="block max-w-none opacity-80" 
                  referrerPolicy="no-referrer"
                  crossOrigin={spritesheetSrc && isCrossOrigin(spritesheetSrc) ? "anonymous" : undefined}
                />

                <div className="absolute inset-0 pointer-events-auto cursor-crosshair">
                  {Array.from({ length: calculatedCols }).map((_, c) => 
                    Array.from({ length: calculatedRows }).map((_, r) => {
                      const isSelected = splicingSelectedCell?.u === c && splicingSelectedCell?.v === r;
                      return (
                        <div 
                          key={`${c}-${r}`}
                          onClick={() => handleSplicerCellClick(c, r)}
                          className={`absolute border transition-all ${
                            isSelected 
                              ? 'border-indigo-400 bg-indigo-500/20 z-10 scale-[1.03] ring-1 ring-indigo-500/30' 
                              : 'border-neutral-500/10 hover:border-indigo-500/40 hover:bg-neutral-100/5'
                          }`}
                          style={{
                            left: `${c * tileWidth}px`,
                            top: `${r * tileHeight}px`,
                            width: `${tileWidth}px`,
                            height: `${tileHeight}px`
                          }}
                          title={`Cell: Column ${c}, Row ${r}`}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Individual crops Parameter Forms */}
            {splicingSelectedCell ? (
              <div className="w-full xl:w-80 shrink-0 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-4">
                <div className="border-b border-neutral-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-450">Crop Definition Setup</span>
                  <h4 className="text-neutral-205 text-neutral-300 text-xs font-bold mt-1">Col Index: {splicingSelectedCell.u} | Row Index: {splicingSelectedCell.v}</h4>
                </div>

                {/* Cropped thumbnail visual preview */}
                <div className="flex items-center space-x-3.5 p-2 bg-neutral-950 rounded-xl border border-neutral-850">
                  <div className="w-12 h-12 rounded border border-neutral-800 bg-neutral-900 flex items-center justify-center overflow-hidden shrink-0">
                    {makeBase64Slice(splicingSelectedCell.u, splicingSelectedCell.v) ? (
                      <img 
                        src={makeBase64Slice(splicingSelectedCell.u, splicingSelectedCell.v)} 
                        alt="cropped piece" 
                        className="w-full h-full object-contain pixelated"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800" />
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-500 block">Texture Fragment</span>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">U: {splicingSelectedCell.u}, V: {splicingSelectedCell.v}</span>
                  </div>
                </div>

                <form onSubmit={handleAddSlicingTile} className="space-y-3 text-xs leading-normal">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">ID CodeName</label>
                    <input 
                      type="text" 
                      value={newTileName} 
                      onChange={e => setNewTileName(e.target.value)} 
                      className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-505 text-neutral-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Visual Label Name</label>
                    <input 
                      type="text" 
                      value={newTileLabel} 
                      onChange={e => setNewTileLabel(e.target.value)} 
                      className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-505 text-neutral-200"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between bg-neutral-950 border border-neutral-850 p-2.5 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        id="auto-solid-crop-field"
                        checked={newTileIsSolid}
                        onChange={e => setNewTileIsSolid(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-850 accent-indigo-650 bg-neutral-950 cursor-pointer"
                      />
                      <label htmlFor="auto-solid-crop-field" className="select-none font-bold text-neutral-400 cursor-pointer text-[11px]">Enforce Solid Collider</label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Description</label>
                    <textarea 
                      value={newTileDesc} 
                      onChange={e => setNewTileDesc(e.target.value)} 
                      placeholder="Optional notes..."
                      className="w-full bg-neutral-950 border border-neutral-850 rounded p-2 focus:outline-none focus:border-indigo-505 text-neutral-300"
                      rows={2}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2 rounded-xl cursor-pointer transition-all text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-indigo-650/15"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Spliced Tile</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 max-w-sm bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center text-neutral-500 h-48 space-y-2 select-none border-dashed">
                <div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-850">
                  <ArrowUp className="w-4 h-4 text-neutral-500" />
                </div>
                <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider">Crop Selector</span>
                <p className="text-[10px] leading-relaxed">Click any cell coordinate grids visual bounds inside the image to parameterize.</p>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* Spritesheet image file upload triggers dropzone */
        <div 
          onClick={() => spritesheetInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-800 bg-neutral-900/10 hover:bg-neutral-900/20 hover:border-indigo-500/40 p-12 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer transition-all space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-950/45 flex items-center justify-center border border-indigo-900/30">
            <LayoutGrid className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider block text-neutral-300">Click to upload spritesheet png image</span>
            <p className="text-[10.5px] text-neutral-550 max-w-sm leading-relaxed">
              Choose or drop your retro-artwork sheet here. The system will slice it under your custom column-row grid matrices instantly.
            </p>
          </div>
        </div>
      )}

      {/* Slices registry overview section */}
      <div className="space-y-4 pt-4 border-t border-neutral-800/80">
        <div className="flex justify-between items-center bg-neutral-900/60 border border-neutral-850 p-3 px-4 rounded-xl">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Slices Registry ({activeTileset.tiles.length})</span>
          </span>
          <span className="text-[9.5px] text-neutral-500 font-mono">Synchronized across active level editor layers.</span>
        </div>

        {activeTileset.tiles.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {activeTileset.tiles.map((t) => (
              <div 
                key={t.id} 
                className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-750 p-2.5 rounded-xl flex flex-col relative group transition-colors justify-between text-xs"
              >
                {/* Micro preview */}
                <div className="w-full h-16 bg-neutral-950 rounded-lg p-1 border border-neutral-850 flex items-center justify-center overflow-hidden mb-1.5 relative group">
                  {t.srcDataUri ? (
                    <img 
                      src={t.srcDataUri} 
                      alt={t.name} 
                      className="max-h-full max-w-full object-contain pixelated" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: t.color }} />
                  )}
                  {t.isSolid && (
                    <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-rose-950/65 border border-rose-900/40 text-rose-300 text-[7px] font-bold font-mono">SOLID</span>
                  )}
                </div>

                <div className="truncate">
                  <span className="text-[10px] font-bold text-neutral-300 truncate block">{t.label || t.name}</span>
                  <span className="text-[8px] text-neutral-500 font-mono block">Code: ID #{t.id}</span>
                </div>

                <button 
                  type="button"
                  onClick={() => handleRemoveTile(t.id)}
                  className="absolute bottom-2 right-2 text-neutral-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-950 border border-neutral-800 rounded"
                  title="Remove slice definition"
                >
                  <ArrowDown className="w-3 h-3 text-rose-455" />
                  {/* Delete label */}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 bg-neutral-900/20 rounded-xl border border-dashed border-neutral-800 text-center text-neutral-500 text-xs">
            No custom slice definitions mapped. Click grid cells inside spritesheet to begin.
          </div>
        )}
      </div>

    </div>
  );
}
