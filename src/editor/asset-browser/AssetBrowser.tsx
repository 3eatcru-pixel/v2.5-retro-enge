import { 
  Image as ImageIcon, LayoutGrid, Folders,
  Search, PackageOpen, MonitorPlay, FileImage, FileAudio, LayoutTemplate
} from 'lucide-react';
import { useEngineStore } from '../../state/engine.store';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Asset } from '../../core/resources/AssetDatabase';
import { pushConsoleLog } from '../console-panel/ConsolePanel';
import { ASSET_PACKAGES, installAssetPackage, isPackageInstalled } from '../../core/resources/AssetPackages';

type FilterType = 'all' | 'sprites' | 'tilesets' | 'animations' | 'audio' | 'prefabs' | 'templates';

export function AssetBrowser() {
  const engine = useEngineStore((s) => s.engine);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<'local' | 'store'>('local');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!engine) return;
    const refresh = () => setAssets(engine.assets.getAllAssets());
    const interval = setInterval(refresh, 1000); // UI Polling to keep it simple
    refresh();
    return () => clearInterval(interval);
  }, [engine]);

  const handleFileUpload = async (files: FileList) => {
    if (!engine) return;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/');
        
        if (!isImage && !isAudio) {
            pushConsoleLog('error', 'ASSET_MGR', `Unsupported file format: ${file.name}`);
            continue;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return;
            const dataUrl = e.target.result as string;
            
            // Clean up name by removing extension
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            const id = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            
            const metadata = {
                guid: id,
                type: isImage ? 'image' : 'audio' as const,
                name: cleanName,
                sourceUrl: dataUrl,
                dependencies: [],
                version: 1,
                tags: [isImage ? 'image' : 'audio', 'imported']
            } as any;

            await engine.assets.registerAsset(metadata);
            await engine.assets.loadAsset(id);
            
            pushConsoleLog('success', 'ASSET_MGR', `Imported local asset: ${cleanName}`);
        };
        reader.readAsDataURL(file);
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Name logic
      const nameMatch = asset.metadata.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       asset.metadata.guid.toLowerCase().includes(searchQuery.toLowerCase());
      if (!nameMatch) return false;

      // Type logic
      const type = asset.metadata.type;
      const tags = asset.metadata.tags || [];
      if (filterType === 'all') return true;
      if (filterType === 'sprites') return type === 'image' && !tags.includes('tileset');
      if (filterType === 'tilesets') return type === 'image' && tags.includes('tileset');
      if (filterType === 'audio') return type === 'audio';
      if (filterType === 'prefabs') return tags.includes('prefab');
      if (filterType === 'animations') return tags.includes('animation');
      if (filterType === 'templates') return tags.includes('template');
      return true;
    });
  }, [assets, filterType, searchQuery]);

  return (
    <div className="flex h-full w-full bg-neutral-950 font-sans text-neutral-200">
      
      {/* Sidebar Filter Menu */}
      <div className="w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col pt-3 pb-3 shrink-0 relative z-10">
        <div className="px-4 mb-4 mt-1 flex justify-between items-center">
            <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-widest flex items-center space-x-1.5">
                <Folders className="w-4 h-4 text-emerald-400" />
                <span>Asset Vault</span>
            </h3>
        </div>

        <div className="flex px-4 space-x-1 mb-4 border-b border-neutral-800 pb-4">
            <button 
               onClick={() => setActiveTab('local')}
               className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'local' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'}`}
            >
                Local Files
            </button>
            <button 
               onClick={() => setActiveTab('store')}
               className={`flex-1 flex justify-center items-center py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'store' ? 'bg-indigo-600/20 text-indigo-300' : 'text-neutral-500 hover:text-indigo-400/70 hover:bg-neutral-800/50'}`}
            >
                <PackageOpen className="w-3 h-3 mr-1" /> Store
            </button>
        </div>

        {activeTab === 'local' && (
            <div className="px-3 space-y-1 flex-1 overflow-y-auto">
                <FilterButton icon={MonitorPlay} label="All Assets" active={filterType === 'all'} onClick={() => setFilterType('all')} count={assets.length} />
                <div className="my-2 h-px bg-neutral-800/60 mx-2" />
                <FilterButton icon={ImageIcon} label="Sprites" active={filterType === 'sprites'} onClick={() => setFilterType('sprites')} count={assets.filter(a => a.metadata.type === 'image' && !a.metadata.tags?.includes('tileset')).length} />
                <FilterButton icon={LayoutGrid} label="Tilesets" active={filterType === 'tilesets'} onClick={() => setFilterType('tilesets')} count={assets.filter(a => a.metadata.type === 'image' && a.metadata.tags?.includes('tileset')).length} />
                <FilterButton icon={FileAudio} label="Audio & SFX" active={filterType === 'audio'} onClick={() => setFilterType('audio')} count={assets.filter(a => a.metadata.type === 'audio').length} />
                <div className="my-2 h-px bg-neutral-800/60 mx-2" />
                <FilterButton icon={LayoutTemplate} label="Animations" active={filterType === 'animations'} onClick={() => setFilterType('animations')} count={assets.filter(a => a.metadata.tags?.includes('animation')).length} />
                <FilterButton icon={PackageOpen} label="Prefabs" active={filterType === 'prefabs'} onClick={() => setFilterType('prefabs')} count={assets.filter(a => a.metadata.tags?.includes('prefab')).length} />
            </div>
        )}

      </div>

      {/* Main Vault Content Area */}
      <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
          
        {/* Top Header / Search */}
        {activeTab === 'local' && (
            <div className="h-14 border-b border-neutral-800 bg-neutral-900/50 flex items-center px-6 justify-between shrink-0">
                <div className="relative w-72">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search workspace assets..."
                        className="w-full bg-neutral-900 border border-neutral-800 py-1.5 pl-9 pr-4 rounded-md text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                <div className="flex space-x-3">
                    <input 
                        type="file" 
                        multiple 
                        accept="image/png, image/jpeg, image/gif, audio/mpeg, audio/wav, audio/ogg"
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => {
                            if (e.target.files) handleFileUpload(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold px-4 py-1.5 rounded-md border border-neutral-700 hover:border-neutral-600 transition-all shadow-sm"
                    >
                        Import File
                    </button>
                </div>
            </div>
        )}

        {/* Local Assets Grid */}
        {activeTab === 'local' && (
            <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/80">
                {filteredAssets.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-neutral-500">
                         <div className="w-16 h-16 border-2 border-dashed border-neutral-700 rounded-2xl flex items-center justify-center mb-4 bg-neutral-900/50">
                             <Search className="w-6 h-6 text-neutral-600" />
                         </div>
                         <p className="text-sm font-medium">No assets found</p>
                         <p className="text-xs mt-1 text-center max-w-sm">
                             Import new files using the top button, or check the Store tab to download standard packs.
                         </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-12">
                        {filteredAssets.map(asset => (
                            <AssetCard key={asset.metadata.guid} asset={asset} />
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Store Catalog */}
        {activeTab === 'store' && (
            <div className="flex-1 overflow-y-auto p-8 bg-neutral-950">
               <div className="max-w-4xl mx-auto space-y-6">
                   <div>
                       <h2 className="text-xl font-bold text-neutral-200">Asset Cloud Store</h2>
                       <p className="text-neutral-500 text-sm mt-1">Download pre-made asset packages to jumpstart your project.</p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {ASSET_PACKAGES.map(pack => {
                           const installed = engine ? isPackageInstalled(engine, pack.id) : false;
                           return (
                               <div key={pack.id} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 flex flex-col">
                                   <div className="h-32 bg-neutral-950 rounded-lg mb-4 flex items-center justify-center border border-neutral-800/50 overflow-hidden relative">
                                        <MonitorPlay className="w-10 h-10 text-neutral-700" />
                                        {installed && (
                                            <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                                INSTALLED
                                            </div>
                                        )}
                                   </div>
                                   <h3 className="font-semibold text-neutral-200 text-sm">{pack.name}</h3>
                                   <p className="text-xs text-neutral-500 mt-1 mb-4 flex-1">{pack.description}</p>
                                   
                                   <button 
                                       disabled={installed}
                                       onClick={async () => {
                                           if (engine) {
                                               pushConsoleLog('info', 'STORE', `Downloading package: ${pack.name}...`);
                                               await installAssetPackage(engine, pack.id);
                                               pushConsoleLog('success', 'STORE', `Installed ${pack.name} successfully.`);
                                           }
                                       }}
                                       className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${installed ? 'bg-neutral-800 text-neutral-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'}`}
                                   >
                                       {installed ? "Already in Workspace" : "Download & Import"}
                                   </button>
                               </div>
                           );
                       })}
                   </div>
               </div>
            </div>
        )}

      </div>
    </div>
  );
}

function FilterButton({ icon: Icon, label, active, onClick, count }: { icon: any, label: string, active: boolean, onClick: () => void, count: number }) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all group ${
                active ? 'bg-indigo-500/15 text-indigo-300' : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
            }`}
        >
            <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-400'}`} />
                <span className="text-xs font-medium">{label}</span>
            </div>
            <span className={`text-[10px] font-mono ${active ? 'text-indigo-400/80' : 'text-neutral-600'}`}>{count}</span>
        </button>
    );
}

function AssetCard({ asset }: { asset: Asset }) {
    return (
        <div 
            className="group relative bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 hover:bg-neutral-800/80 rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all aspect-square outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title={asset.metadata.name || asset.metadata.guid}
        >
            <div className="w-full flex-1 flex items-center justify-center p-2 mb-1">
                {asset.metadata.type === 'image' && asset.metadata.sourceUrl ? (
                     <img 
                        src={asset.metadata.sourceUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-md group-hover:scale-105 transition-transform" 
                        style={{ imageRendering: 'pixelated' }}
                    />
                ) : asset.metadata.type === 'audio' ? (
                     <FileAudio className="w-8 h-8 text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                ) : (
                     <FileImage className="w-8 h-8 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                )}
            </div>
            <div className="w-full text-center px-1 truncate">
                <span className="text-[10px] text-neutral-400 font-medium group-hover:text-neutral-200 transition-colors">
                    {asset.metadata.name || asset.metadata.guid}
                </span>
            </div>
        </div>
    );
}
