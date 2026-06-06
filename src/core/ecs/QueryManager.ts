import { ComponentManager } from './managers/ComponentManager';

export class QueryManager {
  private queryCache: Map<string, Set<number>> = new Map();
  private querySignatures: Map<string, string[]> = new Map();
  private cacheUsageOrder: string[] = [];
  private maxCacheSize: number = 200;

  private getQuerySignature(components: string[]): string {
    // Fast path for 1-3 components
    if (components.length === 1) return components[0];
    if (components.length === 2) {
      if (components[0] < components[1]) return components[0] + ',' + components[1];
      return components[1] + ',' + components[0];
    }
    if (components.length === 3) {
      return [...components].sort().join(','); // fall back
    }
    return [...components].sort().join(',');
  }

  public clear() {
    this.queryCache.clear();
    this.querySignatures.clear();
    this.cacheUsageOrder = [];
  }

  public invalidate(componentNames: string[]) {
    const sig = this.getQuerySignature(componentNames);
    this.queryCache.delete(sig);
    this.querySignatures.delete(sig);
    this.cacheUsageOrder = this.cacheUsageOrder.filter(s => s !== sig);
  }

  private updateLru(sig: string) {
    const idx = this.cacheUsageOrder.indexOf(sig);
    if (idx !== -1) {
      this.cacheUsageOrder.splice(idx, 1);
    }
    this.cacheUsageOrder.push(sig);

    if (this.cacheUsageOrder.length > this.maxCacheSize) {
      const oldest = this.cacheUsageOrder.shift();
      if (oldest) {
        this.queryCache.delete(oldest);
        this.querySignatures.delete(oldest);
      }
    }
  }

  public query(componentNames: string[], componentManager: ComponentManager): ReadonlySet<number> {
    const sig = this.getQuerySignature(componentNames);
    
    if (this.queryCache.has(sig)) {
      this.updateLru(sig);
      return this.queryCache.get(sig)!;
    }

    // Fallback: slow query if not cached, then we cache it
    const entities = componentManager.getEntitiesWith(...componentNames);
    this.queryCache.set(sig, new Set(entities));
    this.querySignatures.set(sig, componentNames);
    this.updateLru(sig);
    
    return this.queryCache.get(sig)!;
  }

  public onComponentAdded(entity: number, componentName: string, componentManager: ComponentManager) {
    for (const [sig, sigComps] of this.querySignatures.entries()) {
      if (sigComps.includes(componentName)) {
        // check if entity now has all components
        const cacheSet = this.queryCache.get(sig);
        if (cacheSet && !cacheSet.has(entity)) {
          let hasAll = true;
          for (const req of sigComps) {
            // Since componentManager allows us to check if component exists
            if (componentManager.getComponent(entity, req) === undefined) {
              hasAll = false;
              break;
            }
          }
          if (hasAll) {
            cacheSet.add(entity);
          }
        }
      }
    }
  }

  public onComponentRemoved(entity: number, componentName: string) {
    for (const [sig, sigComps] of this.querySignatures.entries()) {
      if (sigComps.includes(componentName)) {
        const cacheSet = this.queryCache.get(sig);
        if (cacheSet && cacheSet.has(entity)) {
          cacheSet.delete(entity);
        }
      }
    }
  }

  public onEntityDestroyed(entity: number) {
    for (const cacheSet of this.queryCache.values()) {
      if (cacheSet.has(entity)) {
        cacheSet.delete(entity);
      }
    }
  }
}

