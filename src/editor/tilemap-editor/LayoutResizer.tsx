import { useId } from 'react';
import { LayoutGrid } from 'lucide-react';

interface LayoutResizerProps {
  width: number;
  height: number;
  resizeAnchor: 'tl' | 'tc' | 'tr' | 'cl' | 'cc' | 'cr' | 'bl' | 'bc' | 'br';
  setResizeAnchor: (anchor: 'tl' | 'tc' | 'tr' | 'cl' | 'cc' | 'cr' | 'bl' | 'bc' | 'br') => void;
  handleResizeMap: (w: number, h: number, a: 'tl' | 'tc' | 'tr' | 'cl' | 'cc' | 'cr' | 'bl' | 'bc' | 'br') => void;
}

export function LayoutResizer({
  width,
  height,
  resizeAnchor,
  setResizeAnchor,
  handleResizeMap,
}: LayoutResizerProps) {
  const resizeId = useId();

  return (
    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-md text-xs text-neutral-300">
      <div className="flex items-center space-x-1.5 border-b border-neutral-800 pb-1.5 mb-1">
        <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] uppercase font-black text-neutral-350 tracking-wider">Level Space Resizer</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Grid width (columns)</span>
          <div className="flex bg-neutral-950 border border-neutral-850 rounded px-1.5 py-1 justify-between items-center font-mono font-bold">
            <button
              type="button"
              onClick={() => handleResizeMap(width - 1, height, resizeAnchor)}
              className="text-neutral-500 hover:text-neutral-300 text-xs w-4"
            >
              -
            </button>
            <span className="text-neutral-200">{width}</span>
            <button
              type="button"
              onClick={() => handleResizeMap(width + 1, height, resizeAnchor)}
              className="text-neutral-500 hover:text-neutral-300 text-xs w-4"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Grid height (rows)</span>
          <div className="flex bg-neutral-950 border border-neutral-850 rounded px-1.5 py-1 justify-between items-center font-mono font-bold">
            <button
              type="button"
              onClick={() => handleResizeMap(width, height - 1, resizeAnchor)}
              className="text-neutral-500 hover:text-neutral-300 text-xs w-4"
            >
              -
            </button>
            <span className="text-neutral-200">{height}</span>
            <button
              type="button"
              onClick={() => handleResizeMap(width, height + 1, resizeAnchor)}
              className="text-neutral-500 hover:text-neutral-300 text-xs w-4"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Anchor growth directory selector widget */}
      <div className="space-y-1">
        <span className="text-[9px] uppercase font-bold text-neutral-500 block">Grow/Resize Anchor Direction</span>
        <div id={`grow-anchors-${resizeId}`} className="grid grid-cols-3 gap-1 max-w-[125px] mx-auto bg-neutral-950 p-1 rounded border border-neutral-850 shadow-inner">
          {([
            { id: 'tl', label: '↖️' }, { id: 'tc', label: '⬆️' }, { id: 'tr', label: '↗️' },
            { id: 'cl', label: '⬅️' }, { id: 'cc', label: '⏺️' }, { id: 'cr', label: '➡️' },
            { id: 'bl', label: '↙️' }, { id: 'bc', label: '⬇️' }, { id: 'br', label: '↘️' }
          ] as const).map((dir) => (
            <button
              key={dir.id}
              type="button"
              onClick={() => setResizeAnchor(dir.id)}
              className={`py-0.5 text-[10px] rounded transition-all text-center flex items-center justify-center ${
                resizeAnchor === dir.id
                  ? 'bg-indigo-650 text-white font-extrabold shadow shadow-indigo-600/30'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
              }`}
              title={`Resize anchored to ${dir.id.toUpperCase()}`}
            >
              {dir.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
