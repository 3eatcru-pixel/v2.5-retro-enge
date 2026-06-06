import { AssetMetadata, AssetType } from './AssetMetadata';
import { RetroStorage } from '../storage/RetroStorage';

export class AssetRegistry {
  private static STORAGE_KEY = 'retro_engine_asset_registry_v1';
  private guidToPathMap = new Map<string, string>();
  private pathToGuidMap = new Map<string, string>();
  private metadataMap = new Map<string, AssetMetadata>();

  constructor() {
    this.loadRegistry();
  }

  /**
   * Normalizes a path for consistent registry mapping (stripping leading slashes, converting backslashes)
   */
  public normalize(path: string): string {
    if (!path) return '';
    let clean = path.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
      return clean;
    }
    if (clean.startsWith('/')) {
      clean = clean.substring(1);
    }
    return clean;
  }

  /**
   * Cleans registry mappings
   */
  public clear(): void {
    this.guidToPathMap.clear();
    this.pathToGuidMap.clear();
    this.metadataMap.clear();
    this.saveRegistry();
  }

  /**
   * Registers a path with a stable, immutable GUID, generating one if not present.
   */
  public registerAssetPath(path: string, type: AssetType, existingGuid?: string): string {
    const normPath = this.normalize(path);
    const normGuid = existingGuid ? this.normalize(existingGuid) : undefined;

    // If we already have the path registered, return the existing GUID
    if (this.pathToGuidMap.has(normPath)) {
      return this.pathToGuidMap.get(normPath)!;
    }

    const guid = normGuid || this.generateUUID();
    
    this.guidToPathMap.set(guid, normPath);
    this.pathToGuidMap.set(normPath, guid);

    // Initial default metadata
    const name = normPath.split('/').pop() || normPath;
    this.metadataMap.set(guid, {
      guid,
      type,
      name,
      sourceUrl: normPath,
      dependencies: [],
      version: 1
    });

    this.saveRegistry();
    return guid;
  }

  /**
   * Tracks renaming of a path, preserving the original immutable GUID.
   */
  public renameAssetPath(oldPath: string, newPath: string): void {
    const normOld = this.normalize(oldPath);
    const normNew = this.normalize(newPath);
    const guid = this.pathToGuidMap.get(normOld);
    if (!guid) return;

    this.pathToGuidMap.delete(normOld);
    this.pathToGuidMap.set(normNew, guid);
    this.guidToPathMap.set(guid, normNew);

    const meta = this.metadataMap.get(guid);
    if (meta) {
      meta.sourceUrl = normNew;
      meta.name = normNew.split('/').pop() || normNew;
      meta.version += 1;
    }

    this.saveRegistry();
  }

  /**
   * Returns GUID associated with a path, registering it on-the-fly with the template path if not found.
   */
  public getGuidByPath(path: string, fallbackType: AssetType = 'image'): string {
    const normPath = this.normalize(path);
    let guid = this.pathToGuidMap.get(normPath);
    if (!guid) {
      guid = this.registerAssetPath(normPath, fallbackType);
    }
    return guid;
  }

  /**
   * Returns path associated with a GUID.
   */
  public getPathByGuid(guid: string): string | undefined {
    return this.guidToPathMap.get(this.normalize(guid));
  }

  /**
   * Retrieves full metadata for a GUID.
   */
  public getMetadata(guid: string): AssetMetadata | undefined {
    return this.metadataMap.get(this.normalize(guid));
  }

  /**
   * Updates existing metadata.
   */
  public updateMetadata(guid: string, updates: Partial<AssetMetadata>): void {
    const normGuid = this.normalize(guid);
    const meta = this.metadataMap.get(normGuid);
    if (meta) {
      Object.assign(meta, updates, { guid: normGuid }); // Keep guid invariant
      if (meta.sourceUrl) {
        meta.sourceUrl = this.normalize(meta.sourceUrl);
      }
      this.saveRegistry();
    }
  }

  /**
   * Safely deletes an asset mapping
   */
  public unregisterAsset(guid: string): void {
    const normGuid = this.normalize(guid);
    const path = this.guidToPathMap.get(normGuid);
    if (path) {
      this.pathToGuidMap.delete(path);
    }
    this.guidToPathMap.delete(normGuid);
    this.metadataMap.delete(normGuid);
    this.saveRegistry();
  }

  /**
   * Retrieves all registered metadata entries.
   */
  public getAllMetadata(): AssetMetadata[] {
    return Array.from(this.metadataMap.values());
  }

  /**
   * Generates a stable RFC4122 compliant UUID
   */
  public generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback uuid generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private loadRegistry(): void {
    // 1. Fast synchronous bootstrap load from localStorage (if existing)
    try {
      const stored = localStorage.getItem(AssetRegistry.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.entries)) {
          for (const item of parsed.entries) {
            const { guid, path, metadata } = item;
            if (path) {
              const normGuid = this.normalize(guid);
              const normPath = this.normalize(path);
              this.guidToPathMap.set(normGuid, normPath);
              this.pathToGuidMap.set(normPath, normGuid);
              if (metadata) {
                metadata.guid = normGuid;
                metadata.sourceUrl = this.normalize(metadata.sourceUrl);
                this.metadataMap.set(normGuid, metadata);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not restore AssetRegistry state from localStorage, initializing fresh', err);
    }

    // 2. High-capacity asynchronous reconciliation from RetroStorage/IndexedDB
    RetroStorage.getItem(AssetRegistry.STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.entries)) {
            let newlyLoaded = false;
            for (const item of parsed.entries) {
              const { guid, path, metadata } = item;
              if (path) {
                const normGuid = this.normalize(guid);
                const normPath = this.normalize(path);
                if (!this.guidToPathMap.has(normGuid)) {
                  this.guidToPathMap.set(normGuid, normPath);
                  this.pathToGuidMap.set(normPath, normGuid);
                  if (metadata) {
                    metadata.guid = normGuid;
                    metadata.sourceUrl = this.normalize(metadata.sourceUrl);
                    this.metadataMap.set(normGuid, metadata);
                  }
                  newlyLoaded = true;
                }
              }
            }
            if (newlyLoaded) {
              console.log('[RetroStorage] AssetRegistry state fully merged and synchronized successfully.');
            }
          }
        } catch (err) {
          console.warn('[RetroStorage] Failed to reconcile AssetRegistry async state:', err);
        }
      }
    }).catch((err) => {
      console.warn('[RetroStorage] Error in background AssetRegistry load:', err);
    });
  }

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  private saveRegistry(): void {
    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      try {
        const entries = Array.from(this.guidToPathMap.entries()).map(([guid, path]) => ({
          guid,
          path,
          metadata: this.metadataMap.get(guid)
        }));
        const payload = JSON.stringify({ entries });

        // Backup save to localStorage (subject to size limits)
        try {
          localStorage.setItem(AssetRegistry.STORAGE_KEY, payload);
        } catch (e) {
          // If localStorage is full, we log a console warn but continue. The primary master is IndexedDB anyway now!
          console.warn('[AssetRegistry] localStorage is full; fallback save bypassed. Master copy is preserved inside IndexedDB.');
        }

        // Primary high-capacity save to IndexedDB
        RetroStorage.setItem(AssetRegistry.STORAGE_KEY, payload).catch((err) => {
          console.warn('[RetroStorage] Failed to save AssetRegistry to IndexedDB:', err);
        });

      } catch (err) {
        console.warn('Failed to save AssetRegistry', err);
      }
      this.saveTimeout = null;
    }, 250);
  }
}

export const globalAssetRegistry = new AssetRegistry();
