import { AssetDatabase } from './AssetDatabase';
import { AssetHealthMonitor, AssetHealthInfo } from './AssetHealthMonitor';
import { AssetResolver } from './AssetResolver';
import { AssetMetadata, Asset } from '../resources/AssetMetadata';

// The new Global Asset Management System Entry Point
export class AssetManager {
  public database: AssetDatabase;
  public health: AssetHealthMonitor;
  public resolver: AssetResolver;

  constructor() {
    this.database = new AssetDatabase();
    this.health = new AssetHealthMonitor(this.database);
    this.resolver = new AssetResolver(this.database);
  }

  // Resolves semantic ID like asset://SPR_NINJA_IDLE to underlying data,
  // obscuring raw paths from the editors
  public getAsset(assetId: string): any {
    const resolved = this.resolver.resolveURI(assetId);
    if (!resolved) return undefined;
    return this.database.getAssetData<any>(resolved.guid);
  }

  public resolveURI(uri: string) {
    return this.resolver.resolveURI(uri);
  }

  // Alias for legacy compat
  public getAssetData<T>(assetId: string): T | undefined {
    const resolved = this.resolver.resolveURI(assetId);
    if (!resolved) return undefined;
    return this.database.getAssetData<T>(resolved.guid);
  }

  public getAssetUrl(assetId: string): string {
    const resolved = this.resolver.resolveURI(assetId);
    let rawUrl = assetId;
    if (resolved && resolved.sourceUrl) {
      rawUrl = resolved.sourceUrl;
    }
    if (rawUrl.startsWith('/') || rawUrl.startsWith('http') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
      return rawUrl;
    }
    return '/' + rawUrl;
  }

  public getDependencies(assetId: string): string[] {
    return this.database.getDependencies(assetId);
  }

  public isAssetFailed(assetId: string): boolean {
    const resolved = this.resolver.resolveURI(assetId);
    if (!resolved) return true;
    return this.database.isAssetFailed(resolved.guid);
  }

  public getDependents(assetId: string): string[] {
    return this.database.getDependents(assetId);
  }

  public getAssetMetadata(assetId: string): AssetMetadata | undefined {
    const resolved = this.resolver.resolveURI(assetId);
    if (!resolved) return undefined;
    return this.database.getAssetMetadata(resolved.guid);
  }

  public async registerAsset(metadata: AssetMetadata): Promise<void> {
    return this.database.registerAsset(metadata);
  }

  public async loadAsset(assetId: string): Promise<void> {
    const resolved = this.resolver.resolveURI(assetId);
    if (!resolved) {
      console.warn(`[AssetManager] Could not resolve URI for loadAsset: ${assetId}`);
      return;
    }
    return this.database.loadAsset(resolved.guid);
  }

  public removeAsset(assetId: string): void {
    this.database.removeAsset(assetId);
  }

  public getAllAssets(): Asset[] {
    return this.database.getAllAssets();
  }

  // Health methods proxy
  public getAssetHealthReport(): AssetHealthInfo[] {
    return this.health.getAssetHealthReport();
  }

  public updateAssetHealth(guid: string, status: 'REAL' | 'PLACEHOLDER' | 'ERROR', resolvedUrl: string, errorMessage?: string) {
    this.health.updateAssetHealth(guid, status, resolvedUrl, errorMessage);
  }

  public syncWithRegistry(): void {
    this.database.syncWithRegistry();
  }
}
