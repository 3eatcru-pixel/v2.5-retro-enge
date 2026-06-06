export interface CacheMetadata {
  lastAccessed: number;
  size: number;
  locked: boolean;
}

export class AssetCache {
  private cache = new Map<string, any>();
  private metadata = new Map<string, CacheMetadata>();
  private currentTotalSize: number = 0;
  private maxCacheSize: number;

  constructor(maxSizeMB: number = 256) {
    this.maxCacheSize = maxSizeMB * 1024 * 1024;
  }

  put(guid: string, data: any, sizeBytes: number = 0) {
    if (this.cache.has(guid)) {
      this.remove(guid); // reset size calculation
    }
    this.cache.set(guid, data);
    this.metadata.set(guid, {
      lastAccessed: Date.now(),
      size: sizeBytes || this.estimateSize(data),
      locked: false
    });
    this.currentTotalSize += this.metadata.get(guid)!.size;
    this.evictIfNecessary();
  }

  get(guid: string): any | undefined {
    const data = this.cache.get(guid);
    if (data) {
      const meta = this.metadata.get(guid);
      if (meta) {
        meta.lastAccessed = Date.now();
      }
    }
    return data;
  }

  remove(guid: string) {
    const meta = this.metadata.get(guid);
    if (meta) {
      this.currentTotalSize -= meta.size;
    }
    this.cache.delete(guid);
    this.metadata.delete(guid);
  }

  has(guid: string): boolean {
    return this.cache.has(guid);
  }

  lock(guid: string) {
    const meta = this.metadata.get(guid);
    if (meta) meta.locked = true;
  }

  unlock(guid: string) {
    const meta = this.metadata.get(guid);
    if (meta) meta.locked = false;
  }

  private estimateSize(data: any): number {
    // Basic heuristics. In real engine, Images -> width*height*4, AudioBuffer -> length*channels*4
    if (data instanceof HTMLImageElement) {
      return (data.width || 100) * (data.height || 100) * 4;
    }
    if (data instanceof AudioBuffer) {
      return data.length * data.numberOfChannels * 4; // 32-bit float PCM
    }
    if (typeof data === 'string') {
      return data.length * 2;
    }
    return 1024; // 1KB default fallback
  }

  private evictIfNecessary() {
    if (this.currentTotalSize <= this.maxCacheSize) return;

    // Build array of evictable entries
    const evictable = Array.from(this.metadata.entries())
      .filter(([_, meta]) => !meta.locked)
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    for (const [guid] of evictable) {
      if (this.currentTotalSize <= this.maxCacheSize) break;
      console.log(`[AssetCache] Evicting ${guid} to free memory`);
      this.remove(guid);
    }
  }
}
