import { globalAssetRegistry } from '../resources/AssetRegistry';
import { AssetDatabase } from './AssetDatabase';

export class AssetResolver {
  private database: AssetDatabase;

  constructor(database: AssetDatabase) {
    this.database = database;
  }

  /**
   * Resolves an asset URI or legacy path to a definitive internal GUID or source path.
   * 
   * Formats handled:
   * - asset://[GUID_OR_PATH_OR_NAME] -> resolves to the registered asset
   * - legacy/path/image.png -> attempts to map via AssetRegistry, returns path if not mapped
   */
  public resolveURI(uri: string): { guid: string; sourceUrl: string } | null {
    if (!uri) return null;

    if (uri.startsWith('asset://')) {
      const assetId = uri.substring(8); // Strips asset://
      
      // 1. Check if it's directly a GUID
      let metadata = this.database.getAssetMetadata(assetId);
      if (metadata) {
        return { guid: metadata.guid, sourceUrl: metadata.sourceUrl };
      }
      
      // Normalize the lookup key path for comparison
      const normLookup = assetId.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');

      // 2. Try strict sourceUrl path match first to avoid filename collisions
      const allMetadata = globalAssetRegistry.getAllMetadata();
      metadata = allMetadata.find((m: any) => {
        const normSource = m.sourceUrl.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
        return normSource === normLookup || m.guid === assetId;
      });

      // 3. Fallback: Lookup by filename name only if there are NO ambiguous duplicates
      if (!metadata) {
        const leafName = normLookup.split('/').pop()?.toLowerCase();
        if (leafName) {
          const nameMatches = allMetadata.filter((m: any) => 
            m.name.toLowerCase() === leafName || 
            m.sourceUrl.toLowerCase().endsWith('/' + leafName)
          );

          if (nameMatches.length === 1) {
            metadata = nameMatches[0];
          } else if (nameMatches.length > 1) {
            console.warn(
              `[AssetResolver] AMBIGUOUS FILENAME COLLISION DETECTED for "${leafName}"!\n` +
              `Found ${nameMatches.length} matching asset files inside separate directories. Resolution aborted to prevent layout/sprite errors.\n` +
              `Matched paths:\n` + nameMatches.map(m => ` - ${m.sourceUrl} (GUID: ${m.guid})`).join('\n') + `\n` +
              `ACTION REQUIRED: Resolve using the unique immutable Asset GUID or relative directory paths.`
            );
            // Strictly fail or return null to trigger placeholder safety inside Scene rendering & editors
            return null;
          }
        }
      }

      if (metadata) {
        return { guid: metadata.guid, sourceUrl: metadata.sourceUrl };
      }

      console.warn(`[AssetResolver] Could not resolve asset URI: ${uri}`);
      return null;
    }

    // Legacy path handling (coexists with standard paths)
    const normPath = globalAssetRegistry.normalize(uri);
    const guid = globalAssetRegistry.getGuidByPath(normPath);
    const metadata = this.database.getAssetMetadata(guid) || globalAssetRegistry.getMetadata(guid);

    if (metadata) {
      return { guid: metadata.guid, sourceUrl: metadata.sourceUrl };
    }

    // Fallback if absolutely not registered anywhere yet
    return { guid: normPath, sourceUrl: normPath };
  }
}
