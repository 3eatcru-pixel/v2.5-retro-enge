import { Engine } from '../engine-core/Engine';

export class AssetScanner {
  /**
   * Reads metadata, naming conventions, and file structures to reclassify assets
   * automatically into Sprites or Tilesets based on content signatures.
   */
  static async scanAndReclassify(engine: Engine) {
    const allAssets = engine.assets.getAllAssets();
    let updatedCount = 0;

    for (const asset of allAssets) {
        let changed = false;
        const meta = { ...asset.metadata };
        const tags = meta.tags || [];
        const normId = meta.guid.toLowerCase();

        const isCurrentlySprite = tags.includes('sprite');
        const isCurrentlyTileset = tags.includes('tileset');
        
        // Characteristic signatures in names/paths
        const isCharacters = normId.includes('character') || normId.includes('hero') || normId.includes('monster') || normId.includes('ships') || normId.includes('enemies');
        const isBackground = normId.includes('background') || normId.includes('tileset') || normId.includes('environment') || normId.includes('terrain') || normId.includes('map') || normId.includes('grid');

        const finalTags = new Set(tags);

        if (isBackground && !isCurrentlyTileset) {
            finalTags.delete('sprite');
            finalTags.add('tileset');
            changed = true;
        } else if (isCharacters && !isCurrentlySprite) {
            finalTags.delete('tileset');
            finalTags.add('sprite');
            changed = true;
        }

        // Smart Slicing (inspired by professional sprite importers)
        // If it's a character spritesheet without importOptions, guess standard 4x4 grid.
        if (isCharacters && (!meta.importOptions || (!meta.importOptions.frameWidth && !meta.importOptions.frameHeight))) {
             if (normId.includes('ninja-adventure/')) {
                  meta.importOptions = { frameWidth: 16, frameHeight: 28 };
                  changed = true;
             } else {
                 // We could dynamically measure via engine.assets.getAssetData<HTMLImageElement>(meta.guid)
                 // but for safe persistent heuristics we leave generic flags
             }
        }

        if (changed) {
            meta.tags = Array.from(finalTags);
            await engine.assets.registerAsset(meta);
            updatedCount++;
        }
    }

    return updatedCount;
  }

  /**
   * Scans loaded Image instances to automatically configure slicing parameters based on aspect ratio rules.
   */
  static async autoSliceSpritesheets(engine: Engine, assetIds: string[]) {
     let count = 0;
     for (const guid of assetIds) {
         const meta = engine.assets.getAssetMetadata(guid);
         if (!meta || meta.type !== 'image') continue;
         
         const img = engine.assets.getAssetData<HTMLImageElement>(guid);
         if (img && img.width && img.height) {
              const updatedMeta = { ...meta };
              // Common 4x4 spritesheet (e.g. RPG maker convention)
              if (img.width >= 64 && img.height >= 64 && !updatedMeta.importOptions?.frameWidth) {
                  const probableWidth = img.width / 4;
                  const probableHeight = img.height / 4;
                  
                  // Only if they yield integer values does it cleanly slice
                  if (Number.isInteger(probableWidth) && Number.isInteger(probableHeight)) {
                       updatedMeta.importOptions = {
                           frameWidth: probableWidth,
                           frameHeight: probableHeight
                       };
                       await engine.assets.registerAsset(updatedMeta);
                       count++;
                  }
              }
         }
     }
     return count;
  }

  /**
   * Batch forces selected assets to be reclassified.
   */
  static async batchReclassifyTags(engine: Engine, assetIds: string[], addTag: string, removeTag: string) {
    let count = 0;
    for (const id of assetIds) {
      const asset = engine.assets.getAssetMetadata(id);
      if (asset) {
        const meta = { ...asset };
        const tags = new Set(meta.tags || []);
        let changed = false;
        if (tags.has(removeTag)) {
           tags.delete(removeTag);
           changed = true;
        }
        if (!tags.has(addTag)) {
           tags.add(addTag);
           changed = true;
        }
        
        if (changed) {
            meta.tags = Array.from(tags);
            await engine.assets.registerAsset(meta);
            count++;
        }
      }
    }
    return count;
  }

  /**
   * Scans the active ECS database (entities and components) to backtrack where an asset is referenced
   */
  public static getReferencesInScene(engine: Engine, assetId: string): { entityId: number; componentType: string; property: string }[] {
    const references: { entityId: number; componentType: string; property: string }[] = [];
    const world = engine.world;
    if (!world) return references;

    for (const entity of world.getAllEntities()) {
      const components = world.getComponentsForEntity(entity);
      if (!components) continue;

      for (const [compName, compData] of Object.entries(components)) {
        if (!compData || typeof compData !== 'object') continue;
        this.inspectObjectForAsset(entity, compName, compData, assetId, '', references);
      }
    }
    return references;
  }

  private static inspectObjectForAsset(
    entity: number,
    compName: string,
    obj: any,
    assetId: string,
    path: string,
    references: any[]
  ) {
    if (obj === assetId || (typeof obj === 'string' && (obj.includes(assetId) || assetId.includes(obj)))) {
      references.push({
        entityId: entity,
        componentType: compName,
        property: path || 'value',
      });
      return;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj)) {
        const nextPath = path ? `${path}.${key}` : key;
        if (typeof val === 'string') {
          if (val === assetId || (val.includes(assetId) || assetId.includes(val))) {
            references.push({
              entityId: entity,
              componentType: compName,
              property: nextPath,
            });
          }
        } else if (val && typeof val === 'object') {
          this.inspectObjectForAsset(entity, compName, val, assetId, nextPath, references);
        }
      }
    }
  }

  /**
   * Scans all loaded and registered assets to find:
   * 1. Duplicates by Name (different directories/GUIDs but identical file names)
   * 2. Duplicates by Content (same sizes or hashes derived from cached data)
   * 3. Offline References (assets not loaded 'REAL', i.e. 'PLACEHOLDER' or 'ERROR' still in config/referenced)
   */
  public static scanDuplicatesAndOffline(engine: Engine) {
    const allAssets = engine.assets.getAllAssets();
    const manifestReport = engine.assets.getAssetHealthReport();

    // 1. Group by Name (filename matching)
    const nameGroups = new Map<string, typeof allAssets>();
    for (const asset of allAssets) {
      const filename = asset.metadata.name.toLowerCase();
      if (!nameGroups.has(filename)) {
        nameGroups.set(filename, []);
      }
      nameGroups.get(filename)!.push(asset);
    }

    // Filter down to actual duplicate names
    const duplicateNames: any[] = [];
    for (const [filename, group] of nameGroups.entries()) {
      if (group.length > 1) {
        duplicateNames.push({
          name: filename,
          type: group[0].metadata.type,
          criteria: 'NAME_MATCH',
          items: group.map(asset => {
            const health = manifestReport.find(h => h.guid === asset.metadata.guid);
            const refs = this.getReferencesInScene(engine, asset.metadata.guid);
            return {
              guid: asset.metadata.guid,
              sourceUrl: asset.metadata.sourceUrl,
              status: health?.status || 'REAL',
              references: refs.map(r => `Entity ${r.entityId} [${r.componentType}].${r.property}`)
            };
          })
        });
      }
    }

    // 2. Group by Content Size/Specs if loaded
    const contentGroups = new Map<string, typeof allAssets>();
    for (const asset of allAssets) {
      const guid = asset.metadata.guid;
      const data = engine.assets.getAssetData<any>(guid);
      let fingerprint = '';

      if (data) {
        if (data instanceof HTMLImageElement) {
          fingerprint = `img_${data.width}x${data.height}`;
        } else if (typeof data === 'string') {
          fingerprint = `txt_${data.length}`;
        } else if (data instanceof AudioBuffer) {
          fingerprint = `audio_${data.length}_${data.sampleRate}`;
        }
      }

      if (fingerprint && fingerprint !== 'img_0x0' && fingerprint !== 'txt_0') {
        if (!contentGroups.has(fingerprint)) {
          contentGroups.set(fingerprint, []);
        }
        contentGroups.get(fingerprint)!.push(asset);
      }
    }

    const duplicateContents: any[] = [];
    for (const [fingerprint, group] of contentGroups.entries()) {
      if (group.length > 1) {
        duplicateContents.push({
          name: group[0].metadata.name,
          type: group[0].metadata.type,
          criteria: 'CONTENT_MATCH',
          fingerprint,
          items: group.map(asset => {
            const health = manifestReport.find(h => h.guid === asset.metadata.guid);
            const refs = this.getReferencesInScene(engine, asset.metadata.guid);
            return {
              guid: asset.metadata.guid,
              sourceUrl: asset.metadata.sourceUrl,
              status: health?.status || 'REAL',
              references: refs.map(r => `Entity ${r.entityId} [${r.componentType}].${r.property}`)
            };
          })
        });
      }
    }

    // 3. Extract Offline / Missing references
    const offlineReferences: any[] = [];
    for (const health of manifestReport) {
      if (health.status === 'PLACEHOLDER' || health.status === 'ERROR') {
        const asset = allAssets.find(a => a.metadata.guid === health.guid);
        const refs = this.getReferencesInScene(engine, health.guid);
        offlineReferences.push({
          guid: health.guid,
          name: asset?.metadata.name || health.guid,
          type: asset?.metadata.type || 'image',
          sourceUrl: health.sourceUrl,
          status: health.status,
          referencingEntities: refs
        });
      }
    }

    return {
      duplicateNames,
      duplicateContents,
      offlineReferences,
      totalRegistered: allAssets.length
    };
  }

  /**
   * Generates a heatmap of asset usages across the current scene/ECS/animations.
   */
  public static getUsageHeatmap(engine: Engine): { guid: string; name: string; count: number; referenceSources: string[] }[] {
    const allAssets = engine.assets.getAllAssets();
    const heatmap: { guid: string; name: string; count: number; referenceSources: string[] }[] = [];

    for (const asset of allAssets) {
      const guid = asset.metadata.guid;
      const name = asset.metadata.name;
      const sceneRefs = this.getReferencesInScene(engine, guid);
      
      const referenceSources: string[] = [];
      for (const ref of sceneRefs) {
        referenceSources.push(`Entity ${ref.entityId} [${ref.componentType}].${ref.property}`);
      }

      // Check dependents (other assets depending on this one, e.g. animations or prefabs depending on sprites)
      const dependents = engine.assets.getDependents(guid);
      for (const dep of dependents) {
        referenceSources.push(`Dependent asset ID: ${dep}`);
      }

      heatmap.push({
        guid,
        name,
        count: referenceSources.length,
        referenceSources
      });
    }

    // Sort by count descending
    return heatmap.sort((a, b) => b.count - a.count);
  }

  /**
   * Builds the comprehensive declared dependency graph data.
   */
  public static getDependencyGraphData(engine: Engine): { 
    nodes: { id: string; name: string; type: string; dependenciesCount: number; dependentsCount: number }[];
    links: { source: string; target: string }[];
  } {
    const allAssets = engine.assets.getAllAssets();
    const nodes: any[] = [];
    const links: any[] = [];

    for (const asset of allAssets) {
      const guid = asset.metadata.guid;
      const dependencies = engine.assets.getDependencies(guid);

      nodes.push({
        id: guid,
        name: asset.metadata.name,
        type: asset.metadata.type,
        dependenciesCount: dependencies.length,
        dependentsCount: engine.assets.getDependents(guid).length
      });

      for (const dep of dependencies) {
        links.push({
          source: guid,
          target: dep
        });
      }
    }

    return { nodes, links };
  }
}

