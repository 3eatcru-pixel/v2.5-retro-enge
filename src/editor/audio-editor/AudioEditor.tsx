import { Volume2, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useEngineStore } from '../../state/engine.store';
import { useEditorStore } from '../../state/editor.store';
import { Asset } from '../../core/resources/AssetDatabase';

export function AudioEditor() {
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const engine = useEngineStore((s) => s.engine);
  const [audioAssets, setAudioAssets] = useState<Asset[]>([]);
  useEditorStore((s) => s.editorUpdateToken);

  useEffect(() => {
    if (!engine) return;
    const interval = setInterval(() => {
      setAudioAssets(engine.assets.getAllAssets().filter(a => a.metadata.type === 'audio'));
    }, 1000);
    return () => clearInterval(interval);
  }, [engine]);

  const handlePlayMusic = () => {
    if (engine && selectedAudio) {
      engine.audio.playMusic(selectedAudio, false);
    }
  };

  const handlePlaySound = () => {
    if (engine && selectedAudio) {
      engine.audio.playSound(selectedAudio);
    }
  };

  const handleStop = () => {
    if (engine) engine.audio.stopMusic();
  };

  return (
    <div className="flex flex-col h-full flex-1 bg-neutral-900 border border-neutral-800">
      <div className="h-8 border-b border-neutral-800 flex items-center justify-between px-3 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center space-x-2">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Audio Mixer</span>
        </span>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Audio Bank List */}
        <div className="w-48 border-r border-neutral-800 p-2 overflow-y-auto">
          <div className="text-xs font-medium text-neutral-400 mb-2">Sound Bank</div>
          <div className="space-y-1">
            {audioAssets.map(audio => (
              <div
                key={audio.metadata.guid}
                onClick={() => setSelectedAudio(audio.metadata.guid)}
                className={`px-2 py-1.5 text-xs rounded cursor-pointer transition-colors ${selectedAudio === audio.metadata.guid ? 'bg-indigo-500/20 text-indigo-400' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
              >
                {audio.metadata.name}
              </div>
            ))}
            {audioAssets.length === 0 && (
              <div className="text-[10px] text-neutral-600">No audio assets found. Add via Asset Browser.</div>
            )}
          </div>
        </div>
        {/* Waveform / Mixing Area */}
        <div className="flex-1 bg-neutral-950 flex flex-col relative p-4">
           {selectedAudio ? (
             <>
                <div className="text-sm font-bold text-neutral-300 mb-4">{selectedAudio} Properties</div>
                
                <div className="space-y-6 max-w-sm">
                    <div>
                      <div className="text-xs text-neutral-500 flex justify-between mb-2">
                        <span>Master Volume</span>
                        <span>{engine && engine.audio.getBus('master') ? Math.round(engine.audio.getBus('master')!.gain.value * 100) : 100}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        defaultValue={engine && engine.audio.getBus('master') ? engine.audio.getBus('master')!.gain.value * 100 : 100} 
                        onChange={(e) => { if(engine) engine.audio.setBusVolume('master', parseInt(e.target.value) / 100); }}
                        className="w-full accent-indigo-500 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer" 
                      />
                   </div>

                   <div className="flex items-center space-x-4">
                     <button onClick={handlePlaySound} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium transition-colors border border-neutral-700">Play SFX</button>
                     <button onClick={handlePlayMusic} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium transition-colors border border-neutral-700">Play Mock BGM</button>
                     <button onClick={handleStop} className="p-2 bg-neutral-800 hover:bg-red-500/80 text-neutral-400 hover:text-white rounded transition-colors"><Square className="w-4 h-4 fill-current"/></button>
                   </div>
                </div>
             </>
           ) : (
             <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
               Select an audio track to test
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
