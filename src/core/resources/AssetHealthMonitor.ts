import { AssetDatabase } from './AssetDatabase';

export interface AssetHealthInfo {
  guid: string;
  sourceUrl: string;
  resolvedUrl: string;
  status: 'REAL' | 'PLACEHOLDER' | 'ERROR';
  errorMessage?: string;
  checkedAt: number;
}

export class AssetHealthMonitor {
  private database: AssetDatabase;
  private assetHealthMap = new Map<string, AssetHealthInfo>();

  constructor(database: AssetDatabase) {
    this.database = database;
  }

  public updateAssetHealth(guid: string, status: 'REAL' | 'PLACEHOLDER' | 'ERROR', resolvedUrl: string, errorMessage?: string) {
    const normGuid = guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    const asset = this.database.getAllAssets().find(a => a.metadata.guid === normGuid);
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
    const report: AssetHealthInfo[] = [];
    for (const asset of this.database.getAllAssets()) {
      const guid = asset.metadata.guid;
      const existing = this.assetHealthMap.get(guid);
      if (existing) {
        report.push(existing);
      } else {
        const sourceUrl = asset.metadata.sourceUrl;
        const resolvedUrl = sourceUrl.startsWith('/') || sourceUrl.startsWith('http') || sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')
          ? sourceUrl
          : '/' + sourceUrl;
        report.push({
          guid,
          sourceUrl,
          resolvedUrl,
          status: this.database.isAssetFailed(guid) ? 'PLACEHOLDER' : 'REAL',
          checkedAt: 0
        });
      }
    }
    return report;
  }
}
