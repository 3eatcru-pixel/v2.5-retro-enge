import { useEffect, useState } from 'react';
import { useEngineStore } from '../../state/engine.store';
import { AssetHealthInfo } from '../../core/resources/AssetHealthMonitor';
import { AssetScanner } from '../../core/resources/AssetScanner';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileBox, 
  Copy, 
  Check,
  Layers, 
  HardDrive, 
  AlertOctagon,
  GitBranch,
  Flame,
  Search
} from 'lucide-react';

export function AssetHealthView() {
  const engine = useEngineStore((state) => state.engine);
  const [report, setReport] = useState<AssetHealthInfo[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [dependencyGraphData, setDependencyGraphData] = useState<any>({ nodes: [], links: [] });
  const [activeTab, setActiveTab] = useState<'health' | 'duplicates' | 'offline' | 'dependencies' | 'heatmap'>('health');
  
  // Advanced state filters
  const [selectedDependencyAssetId, setSelectedDependencyAssetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Track which item's copy button was clicked for transient feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshReport = () => {
    if (engine) {
      setReport(engine.assets.getAssetHealthReport());
      try {
        const result = AssetScanner.scanDuplicatesAndOffline(engine);
        setScanResult(result);

        const heatmap = AssetScanner.getUsageHeatmap(engine);
        setHeatmapData(heatmap);

        const graph = AssetScanner.getDependencyGraphData(engine);
        setDependencyGraphData(graph);
      } catch (err) {
        console.warn('AssetScanner scan failed:', err);
      }
    }
  };

  useEffect(() => {
    refreshReport();
    const id = setInterval(refreshReport, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(err => {
      console.warn('[AssetHealthView] Clipboard copy failure:', err);
    });
  };

  const handleCopyFullReport = () => {
    const fullReport = {
      timestamp: new Date().toISOString(),
      reportCountSummaries: {
        total: report.length,
        real: report.filter(r => r.status === 'REAL').length,
        placeholder: report.filter(r => r.status === 'PLACEHOLDER').length,
        error: report.filter(r => r.status === 'ERROR').length,
      },
      registryReport: report,
      collisionScan: scanResult
    };
    handleCopy(JSON.stringify(fullReport, null, 2), 'full_report');
  };

  const realCount = report.filter(r => r.status === 'REAL').length;
  const placeholderCount = report.filter(r => r.status === 'PLACEHOLDER').length;
  const errorCount = report.filter(r => r.status === 'ERROR').length;
  const totalCount = report.length;

  const duplicateNamesTotal = scanResult?.duplicateNames?.length || 0;
  const duplicateContentsTotal = scanResult?.duplicateContents?.length || 0;
  const offlineRefsTotal = scanResult?.offlineReferences?.length || 0;

  return (
    <div className="w-full h-full flex flex-col bg-neutral-900 border-t border-neutral-800 text-neutral-300 font-mono text-sm leading-relaxed">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between p-3 border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-center space-x-4">
          <h2 className="text-sm font-semibold tracking-wide text-indigo-400 flex items-center gap-2">
            <FileBox className="w-4 h-4" />
            Asset Audit Suite
          </h2>
          
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-900 rounded-sm">
              Registered Total: <strong className="text-white">{totalCount}</strong>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-sm">
              <CheckCircle className="w-3 h-3" /> Real: {realCount}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded-sm">
              <AlertTriangle className="w-3 h-3" /> Offline/Placeholder: {placeholderCount}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-900/30 text-red-400 rounded-sm">
              <XCircle className="w-3 h-3" /> Corrupted: {errorCount}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleCopyFullReport}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-850 hover:bg-neutral-805 text-indigo-300 hover:text-indigo-200 rounded text-xs transition-colors border border-indigo-900/40 select-none cursor-pointer"
            title="Copies full telemetry audit payload to clipboard as formatted JSON"
          >
            {copiedId === 'full_report' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-450 animate-bounce" />
                Copied JSON!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Full Report JSON
              </>
            )}
          </button>

          <button 
            onClick={refreshReport}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-505 text-white rounded text-xs transition-colors select-none cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan Assets
          </button>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex h-8 bg-neutral-950 border-b border-neutral-850 px-2 shrink-0 items-center gap-1">
        <button 
          onClick={() => setActiveTab('health')}
          className={`px-3 py-1 text-xs font-semibold rounded-t transition-all flex items-center gap-1.5 ${
            activeTab === 'health' 
              ? 'bg-neutral-900 text-indigo-400 border-t border-l border-r border-neutral-800' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>General Registry Health</span>
        </button>

        <button 
          onClick={() => setActiveTab('duplicates')}
          className={`px-3 py-1 text-xs font-semibold rounded-t transition-all flex items-center gap-1.5 ${
            activeTab === 'duplicates' 
              ? 'bg-neutral-900 text-indigo-400 border-t border-l border-r border-neutral-800' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicate Scanner</span>
          {(duplicateNamesTotal + duplicateContentsTotal) > 0 && (
            <span className="px-1 bg-rose-950 text-rose-400 text-[10px] rounded font-bold animate-pulse">
              {duplicateNamesTotal + duplicateContentsTotal}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('offline')}
          className={`px-3 py-1 text-xs font-semibold rounded-t transition-all flex items-center gap-1.5 ${
            activeTab === 'offline' 
              ? 'bg-neutral-900 text-indigo-400 border-t border-l border-r border-neutral-800' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Scene Reference Backtracker</span>
          {offlineRefsTotal > 0 && (
            <span className="px-1 bg-amber-950 text-amber-400 text-[10px] rounded font-bold">
              {offlineRefsTotal}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('dependencies')}
          className={`px-3 py-1 text-xs font-semibold rounded-t transition-all flex items-center gap-1.5 ${
            activeTab === 'dependencies' 
              ? 'bg-neutral-900 text-indigo-400 border-t border-l border-r border-neutral-800' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Asset dependency Graph</span>
          {dependencyGraphData?.nodes?.filter((n: any) => n.dependenciesCount > 0).length > 0 && (
            <span className="px-1 bg-indigo-950 text-indigo-350 text-[10px] rounded font-bold">
              {dependencyGraphData?.nodes?.filter((n: any) => n.dependenciesCount > 0).length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('heatmap')}
          className={`px-3 py-1 text-xs font-semibold rounded-t transition-all flex items-center gap-1.5 ${
            activeTab === 'heatmap' 
              ? 'bg-neutral-900 text-indigo-400 border-t border-l border-r border-neutral-800' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Usage Heatmap</span>
          {heatmapData?.filter((h: any) => h.count > 0).length > 0 && (
            <span className="px-1 bg-rose-950 text-rose-350 text-[10px] rounded font-bold">
              {heatmapData?.filter((h: any) => h.count > 0).length} used
            </span>
          )}
        </button>
      </div>

      {/* Active Area Panel */}
      <div className="flex-1 overflow-auto p-4">
        
        {/* TAB 1: GENERAL HEALTH */}
        {activeTab === 'health' && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-400">
              Below is the direct physical state profile of all assets listed in this workspace. 
              The system standardizes identifiers and resolves relative endpoints into data objects recursively.
            </p>
            {report.length === 0 ? (
              <div className="text-neutral-500 text-xs italic">No registered assets in registry map.</div>
            ) : (
              <table className="w-full text-left text-xs bg-neutral-950/20 rounded border border-neutral-850">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500 bg-neutral-950/50">
                    <th className="py-2 px-3 font-semibold w-1/12">Status</th>
                    <th className="py-2 px-3 font-semibold w-3/12">Semantic GUID</th>
                    <th className="py-2 px-3 font-semibold w-4/12">Registry Source path</th>
                    <th className="py-2 px-3 font-semibold w-4/12">Data Resolution Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {report.map((item) => (
                    <tr key={item.guid} className="hover:bg-neutral-850/40 transition-colors">
                      <td className="py-2 px-3">
                        {item.status === 'REAL' && <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-sm"><CheckCircle className="w-3 h-3"/> ONLINE</span>}
                        {item.status === 'PLACEHOLDER' && <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-sm"><AlertTriangle className="w-3 h-3"/> MISSING</span>}
                        {item.status === 'ERROR' && <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-sm"><XCircle className="w-3 h-3"/> ERROR</span>}
                      </td>
                      <td className="py-2 px-3 font-semibold text-indigo-300">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="truncate select-all">{item.guid}</span>
                          <button 
                            onClick={() => handleCopy(item.guid, `reg_guid_${item.guid}`)}
                            title="Copy GUID"
                            className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-500 hover:text-white shrink-0"
                          >
                            {copiedId === `reg_guid_${item.guid}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-neutral-400 break-all">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="truncate max-w-[200px] sm:max-w-xs select-all">{item.sourceUrl}</span>
                          <button 
                            onClick={() => handleCopy(item.sourceUrl, `reg_url_${item.guid}`)}
                            title="Copy Path"
                            className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-500 hover:text-white shrink-0"
                          >
                            {copiedId === `reg_url_${item.guid}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-neutral-500 break-all">
                        {item.resolvedUrl || 'Local asset fallback'} 
                        {item.errorMessage && <span className="text-red-400 block mt-1">({item.errorMessage})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: DUPLICATE SCANNER */}
        {activeTab === 'duplicates' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase text-neutral-400 mb-1">🔍 Automatic Duplicate Asset Scanner</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed mb-4">
                Looks for asset collisions on name-level or exact binary size/fingerprints across all virtual mount paths in the project (e.g. <code>assets/</code> vs <code>resources/</code> folders).
              </p>
            </div>

            {/* DUPLICATE NAME GROUPS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1">
                <Copy className="w-3.5 h-3.5" />
                Duplicate Filenames ({duplicateNamesTotal} collisions found)
              </h4>
              
              {duplicateNamesTotal === 0 ? (
                <div className="p-3 bg-neutral-950/20 border border-neutral-850 rounded text-xs text-neutral-500 italic">
                  Excellent! No identical filenames matched from multiple folder hierarchies.
                </div>
              ) : (
                <div className="space-y-4">
                  {scanResult.duplicateNames.map((group: any, idx: number) => (
                    <div key={idx} className="bg-neutral-950/40 rounded border border-neutral-800 p-3 space-y-2">
                      <div className="flex justify-between items-center bg-neutral-900 px-2 py-1 rounded">
                        <span className="text-xs font-bold text-neutral-200">Filename: <span className="text-indigo-400">{group.name}</span></span>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleCopy(JSON.stringify(group, null, 2), `group_name_${idx}`)}
                            title="Copy complete group metadata JSON"
                            className="bg-neutral-800 hover:bg-neutral-750 text-[10px] text-neutral-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"
                          >
                            {copiedId === `group_name_${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            Copy Block
                          </button>
                          <span className="text-[10px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold">{group.type}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 ml-2">
                        {group.items.map((item: any, i: number) => (
                          <div key={i} className="text-xs flex flex-col sm:flex-row justify-between border-b border-neutral-900 pb-1.5 pt-1">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-indigo-300 font-mono select-all">GUID: {item.guid}</span>
                                <button 
                                  onClick={() => handleCopy(item.guid, `guid_dup_name_${idx}_${i}`)}
                                  title="Copy GUID to clipboard"
                                  className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                                >
                                  {copiedId === `guid_dup_name_${idx}_${i}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-neutral-500 select-all">Path: {item.sourceUrl}</span>
                                <button 
                                  onClick={() => handleCopy(item.sourceUrl, `path_dup_name_${idx}_${i}`)}
                                  title="Copy expected source URL path"
                                  className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                                >
                                  {copiedId === `path_dup_name_${idx}_${i}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="text-right sm:self-center">
                              {item.references.length > 0 ? (
                                <div className="text-[10px] text-rose-400 bg-rose-950/20 px-1.5 py-1 border border-rose-900/45 rounded inline-block max-w-[240px] sm:max-w-xs text-left">
                                  <div className="flex justify-between items-center gap-3 mb-1 border-b border-rose-900/40 pb-0.5">
                                    <span className="font-bold">Scene references ({item.references.length})</span>
                                    <button 
                                      onClick={() => handleCopy(item.references.join('\n'), `refs_dup_name_${idx}_${i}`)}
                                      title="Copy Inbound references to clipboard"
                                      className="p-0.5 hover:bg-rose-900 rounded text-rose-400 hover:text-white transition-colors"
                                    >
                                      {copiedId === `refs_dup_name_${idx}_${i}` ? (
                                        <Check className="w-3 h-3 text-emerald-400 animate-pulse" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="text-neutral-400 text-left pl-1 max-h-16 overflow-y-auto font-sans text-[9px] line-clamp-3">
                                    {item.references.map((r: string, rIdx: number) => <div key={rIdx}>• {r}</div>)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800/40">Unreferenced (safe to delete!)</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DUPLICATE CONTENT GROUPS */}
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-neutral-800 pb-1">
                <Layers className="w-3.5 h-3.5" />
                Duplicate Binary Content Spec Groups ({duplicateContentsTotal} found)
              </h4>
              
              {duplicateContentsTotal === 0 ? (
                <div className="p-3 bg-neutral-950/20 border border-neutral-850 rounded text-xs text-neutral-500 italic">
                  No overlapping resolution properties or binary footprints detected in loaded cache!
                </div>
              ) : (
                <div className="space-y-4">
                  {scanResult.duplicateContents.map((group: any, idx: number) => (
                    <div key={idx} className="bg-neutral-950/40 rounded border border-neutral-800 p-3 space-y-2">
                      <div className="flex justify-between items-center bg-neutral-900 px-2 py-1 rounded">
                        <span className="text-xs font-bold text-neutral-200">Asset: <span className="text-indigo-400">{group.name}</span></span>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleCopy(JSON.stringify(group, null, 2), `group_content_${idx}`)}
                            title="Copy complete content match group JSON"
                            className="bg-neutral-850 hover:bg-neutral-800 text-[10px] text-indigo-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"
                          >
                            {copiedId === `group_content_${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            Copy Block
                          </button>
                          <span className="text-[10px] bg-indigo-400/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-bold">{group.fingerprint}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 ml-2">
                        {group.items.map((item: any, i: number) => (
                          <div key={i} className="text-xs flex flex-col sm:flex-row justify-between border-b border-neutral-900 pb-1.5 pt-1">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-indigo-300 font-mono select-all">GUID: {item.guid}</span>
                                <button 
                                  onClick={() => handleCopy(item.guid, `guid_dup_content_${idx}_${i}`)}
                                  title="Copy GUID"
                                  className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                                >
                                  {copiedId === `guid_dup_content_${idx}_${i}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-neutral-500 select-all">Path: {item.sourceUrl}</span>
                                <button 
                                  onClick={() => handleCopy(item.sourceUrl, `path_dup_content_${idx}_${i}`)}
                                  title="Copy Path"
                                  className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                                >
                                  {copiedId === `path_dup_content_${idx}_${i}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="text-right sm:self-center">
                              {item.references.length > 0 ? (
                                <div className="text-[10px] text-rose-400 bg-rose-950/20 px-1.5 py-1 border border-rose-900/40 rounded inline-block max-w-[240px] sm:max-w-xs text-left">
                                  <div className="flex justify-between items-center gap-3 mb-1 border-b border-rose-900/40 pb-0.5">
                                    <span className="font-bold">Scene references ({item.references.length})</span>
                                    <button 
                                      onClick={() => handleCopy(item.references.join('\n'), `refs_dup_content_${idx}_${i}`)}
                                      title="Copy Inbound references to clipboard"
                                      className="p-0.5 hover:bg-rose-953 rounded text-rose-400 hover:text-white transition-colors"
                                    >
                                      {copiedId === `refs_dup_content_${idx}_${i}` ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="text-neutral-400 text-left pl-1 max-h-16 overflow-y-auto font-sans text-[9px] line-clamp-3">
                                    {item.references.map((r: string, rIdx: number) => <div key={rIdx}>• {r}</div>)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800/40">Unreferenced (unused duplicand)</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: OFFLINE BACKTRACKER */}
        {activeTab === 'offline' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase text-neutral-400 mb-1">⚠️ Inbound Scene Reference Backtracker</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed mb-4">
                Lists all missing resources (status: PLACEHOLDER) that are currently referenced by components in active game entities across the hierarchy viewport. This isolates and reveals missing assets cleanly.
              </p>
            </div>

            {offlineRefsTotal === 0 ? (
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs rounded flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Splendid! No registered assets are active on the scene with unresolved broken links. Everything is online.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {scanResult.offlineReferences.map((ref: any, idx: number) => (
                  <div key={idx} className="bg-red-950/15 border border-red-900/40 p-3 rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-red-450 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Broken Link: <span className="text-indigo-300 font-mono select-all">{ref.guid}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleCopy(ref.guid, `guid_offline_${idx}`)}
                          title="Copy broken link GUID"
                          className="bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded flex items-center gap-1 border border-neutral-800 shrink-0"
                        >
                          {copiedId === `guid_offline_${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copy GUID
                        </button>
                        <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">{ref.type}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-500">Expected Resource Path: <code>{ref.sourceUrl}</code></p>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 block">Referenced component fields in scene viewport:</span>
                      {ref.referencingEntities.length === 0 ? (
                        <p className="text-xs text-neutral-550 italic ml-2">No active entities are currently referencing this broken link (safe to ignore or clean up in registry).</p>
                      ) : (
                        <div className="bg-neutral-950/60 rounded p-2 ml-1 text-xs border border-neutral-900 divide-y divide-neutral-900">
                          {ref.referencingEntities.map((entRef: any, index: number) => (
                            <div key={index} className="py-1 flex justify-between">
                              <span className="text-amber-500">Entity {entRef.entityId}</span>
                              <span className="text-neutral-400">Component: <code className="text-indigo-400">{entRef.componentType}</code></span>
                              <span className="text-neutral-500">Property: <code className="break-all text-neutral-400">{entRef.property}</code></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ASSET DEPENDENCY GRAPH */}
        {activeTab === 'dependencies' && (
          <div className="space-y-4 h-full flex flex-col min-h-[400px]">
            <div className="shrink-0 bg-neutral-950/40 p-3 rounded border border-neutral-850">
              <h3 className="text-xs font-bold uppercase text-indigo-400 mb-1 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4" />
                Declared Asset Dependency Graph
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Represents direct linkages, prefabs, animation controllers, and sheets. Under dynamic ECS rendering, assets register dependencies which automatically compile cascade linkage references.
              </p>
              
              {/* Search filter input */}
              <div className="mt-3 relative max-w-sm">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-500" />
                <input 
                  type="text"
                  placeholder="Filter elements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-neutral-900 border border-neutral-850 rounded text-xs text-neutral-250 focus:outline-none focus:border-indigo-600 font-mono"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-4 mt-2">
              {/* Assets Node list */}
              <div className="w-7/12 border border-neutral-850 bg-neutral-950/20 rounded overflow-y-auto flex flex-col p-2 space-y-1 max-h-[460px]">
                <span className="text-[10px] font-bold text-neutral-500 border-b border-neutral-850 pb-1 mb-1 block">Registered Graph Nodes</span>
                {dependencyGraphData?.nodes
                  ?.filter((n: any) => !searchTerm || n.name.toLowerCase().includes(searchTerm.toLowerCase()) || n.id.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((node: any) => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedDependencyAssetId(node.id)}
                      className={`text-left text-xs p-2 rounded flex justify-between items-center transition-colors select-none ${
                        selectedDependencyAssetId === node.id 
                          ? 'bg-indigo-600/20 border border-indigo-550 text-indigo-300' 
                          : 'hover:bg-neutral-850 border border-transparent text-neutral-450'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-semibold truncate">{node.name}</span>
                        <span className="text-[10px] text-neutral-600 font-mono truncate select-all">{node.id}</span>
                      </div>
                      <div className="flex space-x-1.5 text-[9px] shrink-0 font-mono">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${node.dependenciesCount > 0 ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'bg-neutral-900 text-neutral-600'}`}>
                          Deps: {node.dependenciesCount}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${node.dependentsCount > 0 ? 'bg-amber-950 text-amber-400 border border-amber-900/40' : 'bg-neutral-900 text-neutral-600'}`}>
                          Reqs: {node.dependentsCount}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>

              {/* In-depth exploration panel */}
              <div className="w-5/12 border border-neutral-850 bg-neutral-950/40 rounded p-3 flex flex-col space-y-4 overflow-y-auto max-h-[460px]">
                {selectedDependencyAssetId ? (
                  (() => {
                    const node = dependencyGraphData.nodes.find((n: any) => n.id === selectedDependencyAssetId);
                    const dependencies = engine ? engine.assets.getDependencies(selectedDependencyAssetId) : [];
                    const dependents = engine ? engine.assets.getDependents(selectedDependencyAssetId) : [];
                    
                    return (
                      <div className="space-y-4">
                        <div className="border-b border-neutral-800 pb-2">
                          <span className="text-[10px] bg-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded font-bold uppercase float-right">{node?.type || 'asset'}</span>
                          <h4 className="text-xs font-bold text-white select-all">{node?.name}</h4>
                          <span className="text-[10px] text-neutral-500 font-mono select-all block mt-1 break-all">GUID: {selectedDependencyAssetId}</span>
                        </div>

                        {/* dependencies listing */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-indigo-400 block">Outbound Dependencies ({dependencies.length})</span>
                          {dependencies.length === 0 ? (
                            <p className="text-[11px] text-neutral-600 italic pl-1">Standalone node (no dependencies declared).</p>
                          ) : (
                            <div className="bg-neutral-950/60 rounded border border-neutral-900 p-2 divide-y divide-neutral-900">
                              {dependencies.map((depGuid: string) => {
                                const depAsset = dependencyGraphData.nodes.find((n: any) => n.id === depGuid);
                                return (
                                  <div key={depGuid} className="py-1 text-xs truncate">
                                    <span className="font-semibold text-neutral-300 block">{depAsset?.name || 'Unknown resource'}</span>
                                    <span className="text-[10px] text-neutral-500 break-all select-all font-mono">{depGuid}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* dependents listing */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-amber-400 block">Cascading Dependents ({dependents.length})</span>
                          {dependents.length === 0 ? (
                            <p className="text-[11px] text-neutral-600 italic pl-1">Leaf node (no other assets depend on this).</p>
                          ) : (
                            <div className="bg-neutral-950/60 rounded border border-neutral-900 p-2 divide-y divide-neutral-900">
                              {dependents.map((depGuid: string) => {
                                const depAsset = dependencyGraphData.nodes.find((n: any) => n.id === depGuid);
                                return (
                                  <div key={depGuid} className="py-1 text-xs truncate">
                                    <span className="font-semibold text-neutral-300 block">{depAsset?.name || 'Unknown resource'}</span>
                                    <span className="text-[10px] text-neutral-500 break-all select-all font-mono">{depGuid}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => handleCopy(JSON.stringify({ guid: selectedDependencyAssetId, dependencies, dependents }, null, 2), `dep_copy_${selectedDependencyAssetId}`)}
                          className="w-full text-center py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-indigo-300 rounded cursor-pointer transition-colors font-mono select-none"
                        >
                          {copiedId === `dep_copy_${selectedDependencyAssetId}` ? 'Copied Details JSON!' : 'Copy Dependency JSON block'}
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center text-neutral-600 text-xs italic py-16 font-mono">
                    Select a node of the registry map on the left list to explore its cascading connections.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: USAGE HEATMAP */}
        {activeTab === 'heatmap' && (
          <div className="space-y-4">
            <div className="bg-neutral-950/40 p-3 rounded border border-neutral-850">
              <h3 className="text-xs font-bold uppercase text-rose-400 mb-1 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                Asset Usage Heatmap & Clean metrics
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-mono">
                Lists all registered assets sorted by active physical references inside entities, tilemaps, animations, or graph cascades. Helps you instantly identify dead references, high-traffic sprite sheets, and duplicates.
              </p>
            </div>

            {heatmapData.length === 0 ? (
              <div className="text-neutral-550 text-xs italic py-4">Heatmap is empty. Execute scans first.</div>
            ) : (
              <div className="space-y-2">
                {heatmapData.map((item: any, idx: number) => {
                  const isUnused = item.count === 0;
                  
                  // Color codes based on reference counts
                  let cardBorderColor = 'border-neutral-850 bg-neutral-950/20';
                  let countBadgeColor = 'bg-neutral-900 text-neutral-550 border-neutral-850';
                  
                  if (item.count > 5) {
                    cardBorderColor = 'border-red-950/70 bg-red-950/10 text-red-100';
                    countBadgeColor = 'bg-red-950/80 text-rose-400 border-red-900/30';
                  } else if (item.count > 0) {
                    cardBorderColor = 'border-indigo-950 bg-indigo-950/10 text-neutral-200';
                    countBadgeColor = 'bg-indigo-950/80 text-indigo-300 border-indigo-900/40';
                  }

                  return (
                    <div key={idx} className={`border rounded p-3 transition-colors ${cardBorderColor} flex flex-col sm:flex-row justify-between gap-3 sm:items-center`}>
                      <div className="flex flex-col truncate min-w-0">
                        <span className="text-xs font-bold text-neutral-250 truncate select-all">{item.name}</span>
                        <span className="text-[10px] text-neutral-550 font-mono truncate select-all">GUID: {item.guid}</span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center font-mono">
                        {isUnused ? (
                          <span className="text-[10px] font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                            Unused (Safe to Cull)
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-sm border ${countBadgeColor}`}>
                            References: {item.count}
                          </span>
                        )}

                        {item.count > 0 && (
                          <button
                            onClick={() => handleCopy(item.referenceSources.join('\n'), `heat_refs_${idx}`)}
                            title="Copy list of reference targets"
                            className="p-1 rounded bg-neutral-950 hover:bg-neutral-850 border border-neutral-850 text-neutral-550 hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedId === `heat_refs_${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Display small reference sources list inside card if active */}
                      {item.count > 0 && (
                        <div className="w-full mt-2 font-mono text-[9px] text-neutral-500 bg-neutral-950/50 rounded p-1.5 border border-neutral-900/60 leading-normal block">
                          <strong>Active linkages ({item.count}):</strong>
                          <div className="divide-y divide-neutral-900">
                            {item.referenceSources.slice(0, 3).map((src: string, srcIdx: number) => (
                              <div key={srcIdx} className="py-0.5 truncate">• {src}</div>
                            ))}
                            {item.referenceSources.length > 3 && (
                              <div className="text-indigo-400 pt-0.5 font-bold">and {item.referenceSources.length - 3} more references...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
