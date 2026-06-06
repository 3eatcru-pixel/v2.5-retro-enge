import { AudioSystem } from '../audio/AudioSystem';
import { AssetType, AssetMetadata, Asset } from './AssetMetadata';
export type { AssetType, AssetMetadata, Asset };
import { DependencyGraph } from './DependencyGraph';
import { AssetCache } from './AssetCache';
import { globalAssetRegistry } from './AssetRegistry';

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

export interface AssetHealthInfo {
  guid: string;
  sourceUrl: string;
  resolvedUrl: string;
  status: 'REAL' | 'PLACEHOLDER' | 'ERROR';
  errorMessage?: string;
  checkedAt: number;
}

// Emits events when assets are loaded/removed
export class AssetDatabase {
  private assets = new Map<string, Asset>();
  private audioSystem: AudioSystem | null = null;
  private loadPromises = new Map<string, Promise<void>>();
  private dependencyGraph = new DependencyGraph();
  private cache = new AssetCache(256); // 256MB max size
  private failedAssets = new Set<string>();
  private assetHealthMap = new Map<string, AssetHealthInfo>();

  constructor() {
    this.syncWithRegistry();
  }

  public isAssetFailed(guid: string): boolean {
    if (!guid) return false;
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    return this.failedAssets.has(normGuid);
  }

  public updateAssetHealth(guid: string, status: 'REAL' | 'PLACEHOLDER' | 'ERROR', resolvedUrl: string, errorMessage?: string) {
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    const asset = this.assets.get(normGuid);
    const sourceUrl = asset?.metadata?.sourceUrl || normGuid;
    this.assetHealthMap.set(normGuid, {
      guid: normGuid,
      sourceUrl,
      resolvedUrl,
      status,
      errorMessage,
      checkedAt: Date.now()
    });
  }

  public getAssetHealthReport(): AssetHealthInfo[] {
    // Populate any registered assets that haven't been checked yet as default checked values
    const report: AssetHealthInfo[] = [];
    for (const [guid, asset] of this.assets.entries()) {
      const existing = this.assetHealthMap.get(guid);
      if (existing) {
        report.push(existing);
      } else {
        report.push({
          guid,
          sourceUrl: asset.metadata.sourceUrl,
          resolvedUrl: '',
          status: this.failedAssets.has(guid) ? 'PLACEHOLDER' : 'REAL', // Default inference or unknown
          checkedAt: 0
        });
      }
    }
    return report;
  }

  public syncWithRegistry(): void {
    const registryMetadata = globalAssetRegistry.getAllMetadata();
    for (const meta of registryMetadata) {
      if (!this.assets.has(meta.guid)) {
        this.assets.set(meta.guid, { metadata: meta });
        this.dependencyGraph.addNode(meta.guid);
        for (const dep of meta.dependencies || []) {
          this.dependencyGraph.addDependency(meta.guid, dep);
        }
      }
    }
  }

  public async loadManifest(url: string): Promise<void> {
    try {
      const res = await fetch(url);
      const manifest = await res.json();
      
      for (const item of manifest) {
        const normId = item.id.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
        const normUrl = item.url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
        await this.registerAsset({
          guid: normId,
          type: item.type,
          name: normId.split('/').pop() || normId,
          sourceUrl: normUrl,
          dependencies: [],
          version: 1,
          tags: item.tags
        });
      }
      console.log(`Loaded ${manifest.length} assets from manifest.`);
    } catch (err) {
      console.error('Failed to load asset manifest', err);
    }
  }

  public setAudioSystem(am: AudioSystem) {
    this.audioSystem = am;
  }

  public getAudioContext(): AudioContext | null {
     if (this.audioSystem) {
        return (this.audioSystem as any).context;
     }
     return null;
  }

  public async registerAsset(metadata: AssetMetadata): Promise<void> {
    const normGuid = metadata.guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    const normUrl = metadata.sourceUrl.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    
    metadata.guid = normGuid;
    metadata.sourceUrl = normUrl;

    if (this.assets.has(normGuid)) {
      this.assets.get(normGuid)!.metadata = metadata;
      globalAssetRegistry.registerAssetPath(normUrl, metadata.type, normGuid);
      globalAssetRegistry.updateMetadata(normGuid, metadata);
      return; // Already registered
    }
    this.assets.set(normGuid, { metadata });
    
    globalAssetRegistry.registerAssetPath(normUrl, metadata.type, normGuid);
    globalAssetRegistry.updateMetadata(normGuid, metadata);
    
    this.dependencyGraph.addNode(normGuid);
    for (const dep of metadata.dependencies || []) {
      const normDep = dep.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
      this.dependencyGraph.addDependency(normGuid, normDep);
    }
  }

  public async loadAsset(guid: string): Promise<void> {
    if (!guid) return;
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    if (this.failedAssets.has(normGuid)) {
      return;
    }

    let asset = this.assets.get(normGuid);
    if (!asset && normGuid && (normGuid.startsWith('assets/') || normGuid.includes('/') || normGuid.includes('.'))) {
      const type: AssetType = (normGuid.endsWith('.ogg') || normGuid.endsWith('.mp3') || normGuid.endsWith('.wav')) ? 'audio' : 'image';
      const name = normGuid.split('/').pop() || normGuid;
      await this.registerAsset({
        guid: normGuid,
        type,
        name,
        sourceUrl: normGuid,
        dependencies: [],
        version: 1,
        tags: ['auto-registered']
      });
      asset = this.assets.get(normGuid);
    }
    if (!asset) throw new Error(`Asset with GUID ${normGuid} not registered`);

    if (this.cache.has(normGuid)) return; // Already loaded

    if (this.loadPromises.has(normGuid)) {
      return this.loadPromises.get(normGuid); // Currently loading
    }

    const loadPromise = new Promise<void>((resolve) => {
      (async () => {
        try {
          const { type, sourceUrl } = asset.metadata;
          let resolvedUrl = sourceUrl;
          if (resolvedUrl && !resolvedUrl.startsWith('/') && !resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://') && !resolvedUrl.startsWith('data:')) {
            resolvedUrl = '/' + resolvedUrl;
          }

          if (type === 'image') {
            const urlsToTry: string[] = [];
            if (resolvedUrl) {
              urlsToTry.push(resolvedUrl);
              
              // Fallback 1: Strip leading slash if present (enables relative loading under subpath/proxies)
              if (resolvedUrl.startsWith('/')) {
                urlsToTry.push(resolvedUrl.slice(1));
              } else {
                // Fallback 2: Prepend leading slash if absent
                urlsToTry.push('/' + resolvedUrl);
              }
              
              // Fallback 3: Try resolving relative to current document window address
              try {
                if (typeof window !== 'undefined') {
                  urlsToTry.push(new URL(resolvedUrl, window.location.href).href);
                  if (resolvedUrl.startsWith('/')) {
                    urlsToTry.push(new URL(resolvedUrl.slice(1), window.location.href).href);
                  }
                }
              } catch (e) {
                console.debug("Failed url fallback resolve:", e);
              }
            }
            
            let urlIndex = 0;
            const tryLoadNextUrl = () => {
              if (urlIndex < urlsToTry.length) {
                const currentUrl = urlsToTry[urlIndex];
                urlIndex++;
                const img = new Image();
                if (currentUrl && isCrossOrigin(currentUrl)) {
                  img.crossOrigin = 'anonymous';
                }
                img.onload = () => {
                  this.cache.put(normGuid, img);
                  this.updateAssetHealth(normGuid, 'REAL', currentUrl);
                  resolve();
                };
                img.onerror = () => {
                  tryLoadNextUrl();
                };
                img.src = currentUrl;
              } else {
                this.generateFallbackGraphics(normGuid, resolve);
              }
            };
            
            tryLoadNextUrl();
          } else if (type === 'audio') {
            try {
              const response = await fetch(resolvedUrl);
              if (!response.ok) throw new Error(`HTTP fetch failed with code ${response.status}`);
              const arrayBuffer = await response.arrayBuffer();
              const ctx = this.getAudioContext();
              if (ctx) {
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                if (audioBuffer) {
                  this.cache.put(normGuid, audioBuffer);
                  if (this.audioSystem) {
                     this.audioSystem.registerSound(normGuid, audioBuffer);
                  }
                  this.updateAssetHealth(normGuid, 'REAL', resolvedUrl);
                } else {
                  throw new Error("Failed to decode audio context node stream buffer");
                }
              } else {
                // Background caching without playback registration
                this.updateAssetHealth(normGuid, 'REAL', resolvedUrl, "Cached arrayBuffer content - AudioContext was inactive.");
              }
              resolve();
            } catch (err: any) {
              console.warn(`[Asset Loader] Audio load/decode failed for ${normGuid}:`, err);
              this.updateAssetHealth(normGuid, 'ERROR', resolvedUrl, err?.message || String(err));
              this.failedAssets.add(normGuid);
              resolve();
            }
          } else {
             // Basic fetch for JSON or raw data
             try {
               const response = await fetch(resolvedUrl);
               if (!response.ok) throw new Error(`HTTP fetch failed with code ${response.status}`);
               const rawStr = await response.text();
               this.cache.put(normGuid, rawStr);
               this.updateAssetHealth(normGuid, 'REAL', resolvedUrl);
               resolve();
             } catch (err: any) {
               console.warn(`[Asset Loader] Generic data load failed for ${normGuid}:`, err);
               this.updateAssetHealth(normGuid, 'ERROR', resolvedUrl, err?.message || String(err));
               this.failedAssets.add(normGuid);
               resolve();
             }
          }
        } catch (err: any) {
          console.warn(`[Asset Loader] Error processing load pipeline for ${normGuid}:`, err);
          this.updateAssetHealth(normGuid, 'ERROR', '', err?.message || String(err));
          this.generateFallbackGraphics(normGuid, resolve);
        }
      })();
    });

    this.loadPromises.set(normGuid, loadPromise);
    await loadPromise;
    this.loadPromises.delete(normGuid);
  }

  private generateFallbackGraphics(guid: string, resolve: () => void): void {
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    try {
      this.failedAssets.add(normGuid);
      
      const asset = this.assets.get(normGuid);
      const originalSource = asset?.metadata?.sourceUrl || normGuid;
      this.updateAssetHealth(normGuid, 'PLACEHOLDER', originalSource, "Using fallback procedural canvas graphics");

      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Base color decoration
        ctx.fillStyle = '#1e293b'; // slate background
        ctx.fillRect(0, 0, 16, 16);

        const isPlayer = normGuid.includes('characters/') || normGuid.includes('player') || normGuid.includes('hero');
        const isCoin = normGuid.includes('items/') || normGuid.includes('coin') || normGuid.includes('gold-coin');
        const isMonster = normGuid.includes('monsters/') || normGuid.includes('enemy') || normGuid.includes('slime') || normGuid.includes('bat');

        if (isCoin) {
          // Yellow gold coin shape
          ctx.beginPath();
          ctx.arc(8, 8, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.fillStyle = '#d97706';
          ctx.fillRect(7, 5, 2, 6);
          ctx.fillRect(5, 7, 6, 2);
        } else if (isPlayer) {
          // Yellow/Golden Knight box
          ctx.fillStyle = normGuid.includes('characters/3') || normGuid.includes('hero') ? '#06b6d4' : '#fbbf24';
          ctx.fillRect(3, 3, 10, 10);
          ctx.fillStyle = '#1e3a8a'; // eyes
          ctx.fillRect(5, 5, 2, 2);
          ctx.fillRect(9, 5, 2, 2);
        } else if (isMonster) {
          // Red enemy/monster
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(3, 4, 10, 9);
          ctx.fillStyle = '#fef08a'; // custom angry glowing eyes
          ctx.fillRect(4, 6, 2, 2);
          ctx.fillRect(10, 6, 2, 2);
        } else {
          // General grey grid tile
          ctx.fillStyle = '#475569';
          ctx.fillRect(2, 2, 12, 12);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(4, 4, 8, 8);
        }

        // Distinct border
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 16, 16);
      }
      
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        this.cache.put(normGuid, fallbackImg);
        console.warn(`[Asset Loader] Resolved procedural fallback graphics for missed asset: ${normGuid}`);
        resolve();
      };
      fallbackImg.src = canvas.toDataURL();
    } catch {
      // absolute silent fallback
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        this.cache.put(normGuid, fallbackImg);
        resolve();
      };
      fallbackImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
  }

  public removeAsset(guid: string): void {
    if (!guid) return;
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    this.loadPromises.delete(normGuid);
    this.assets.delete(normGuid);
    this.dependencyGraph.removeNode(normGuid);
    this.cache.remove(normGuid);
    this.assetHealthMap.delete(normGuid);
    globalAssetRegistry.unregisterAsset(normGuid);
  }

  public getAssetData<T>(guid: string): T | undefined {
    if (!guid) return undefined;
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    return this.cache.get(normGuid) as T;
  }

  public getAssetMetadata(guid: string): AssetMetadata | undefined {
    if (!guid) return undefined;
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    let entry = this.assets.get(normGuid);
    if (!entry && normGuid && (normGuid.startsWith('assets/') || normGuid.includes('/') || normGuid.includes('.'))) {
      const type: AssetType = (normGuid.endsWith('.ogg') || normGuid.endsWith('.mp3') || normGuid.endsWith('.wav')) ? 'audio' : 'image';
      const name = normGuid.split('/').pop() || normGuid;
      const meta: AssetMetadata = {
        guid: normGuid,
        type,
        name,
        sourceUrl: normGuid,
        dependencies: [],
        version: 1,
        tags: ['auto-registered']
      };
      this.registerAsset(meta).catch(() => {});
      entry = this.assets.get(normGuid);
    }
    return entry?.metadata;
  }

  public getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  public getDependencies(guid: string): string[] {
    return this.dependencyGraph.getDependencies(guid);
  }
  
  public getDependents(guid: string): string[] {
    return this.dependencyGraph.getDependents(guid);
  }
}

