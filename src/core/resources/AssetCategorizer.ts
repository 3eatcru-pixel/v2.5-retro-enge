import { Engine } from '../engine-core/Engine';
import { AssetMetadata } from './AssetMetadata';

export interface ReadmeInfo {
  tileSize?: { width: number; height: number };
  frameSize?: { width: number; height: number };
  keywords: string[];
}

export class AssetCategorizer {
  private static readmeCache = new Map<string, ReadmeInfo>();

  /**
   * Fetches and parses a README.md file from a pack folder to extract sizes and keywords.
   */
  public static async fetchAndParseReadme(packId: string): Promise<ReadmeInfo> {
    const cached = this.readmeCache.get(packId);
    if (cached) return cached;

    const urlsToTry = [
      `/${packId}/README.md`,
      `/assets/${packId}/README.md`,
      `/superpowers-asset-packs-master/${packId}/README.md`,
      `/western-fps-2d/${packId}/README.md`
    ];

    let content = '';
    for (const url of urlsToTry) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          content = await response.text();
          break;
        }
      } catch (e) {
        // Silent retry
      }
    }

    const info: ReadmeInfo = {
      keywords: []
    };

    if (content) {
      // 1. Parse tile size rules (e.g. "Tile size: 32x32" or "Tile width: 16")
      const tileSizeRegexes = [
        /tile\s*size:\s*(\d+)\s*x\s*(\d+)/i,
        /tile\s*dim:\s*(\d+)\s*x\s*(\d+)/i,
        /tileset\s*size:\s*(\d+)\s*x\s*(\d+)/i
      ];

      for (const regex of tileSizeRegexes) {
        const match = content.match(regex);
        if (match) {
          info.tileSize = {
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10)
          };
          break;
        }
      }

      // 2. Parse frame size rules (e.g. "frame size: 63x66" or "Frame dimensions: 16x28")
      const frameSizeRegexes = [
        /frame\s*size:\s*(\d+)\s*x\s*(\d+)/i,
        /character\s*frame\s*size:\s*(\d+)\s*x\s*(\d+)/i,
        /frame\s*dim:\s*(\d+)\s*x\s*(\d+)/i,
        /sprite\s*size:\s*(\d+)\s*x\s*(\d+)/i
      ];

      for (const regex of frameSizeRegexes) {
        const match = content.match(regex);
        if (match) {
          info.frameSize = {
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10)
          };
          break;
        }
      }

      // 3. Extract keywords from text
      const possibleKeywords = ['background', 'character', 'scenario', 'tileset', 'grid', 'parallax', 'dungeon', 'hud', 'ui', 'weapon', 'animal', 'synthwave'];
      const textLower = content.toLowerCase();
      possibleKeywords.forEach(kw => {
        if (textLower.includes(kw)) {
          info.keywords.push(kw);
        }
      });

      console.log(`[AssetCategorizer] Successfully parsed README for "${packId}". Extracted:`, {
        tileSize: info.tileSize,
        frameSize: info.frameSize,
        keywords: info.keywords
      });
    } else {
      // Offline/Local default heuristics
      if (packId.includes('western-fps-2d')) {
        info.tileSize = { width: 32, height: 32 };
        info.frameSize = { width: 63, height: 66 };
        info.keywords = ['background', 'character', 'scenario', 'tileset', 'sound', 'gun'];
      } else if (packId.includes('ninja-adventure')) {
        info.tileSize = { width: 16, height: 16 };
        info.frameSize = { width: 16, height: 28 };
        info.keywords = ['ninja', 'character', 'tileset', 'dungeon', 'props', 'item'];
      } else if (packId.includes('backgrounds')) {
        info.keywords = ['background', 'backdrop', 'parallax', 'scenery'];
      } else if (packId.includes('space-shooter')) {
        info.keywords = ['projectile', 'laser', 'projectile', 'scifi', 'ship', 'character'];
      }
    }

    this.readmeCache.set(packId, info);
    return info;
  }

  /**
   * Scans all loaded assets in the engine, fetches corresponding README configurations,
   * categorizes each asset and configures slice dimensions based on parsed rules.
   */
  public static async scanAndCategorize(
    engine: Engine,
    onLog?: (type: 'info' | 'success' | 'warn' | 'error', category: string, message: string) => void
  ): Promise<number> {
    const allAssets = engine.assets.getAllAssets();
    let reclassifiedCount = 0;

    // First, find all distinct package directories among assets to pre-parse READMEs
    const packNames = new Set<string>();
    allAssets.forEach(asset => {
      const parts = asset.metadata.guid.split('/');
      if (parts.length > 1) {
        // If it starts with assets/, find the next folder
        if (parts[0] === 'assets' && parts.length > 2) {
          packNames.add(parts[1]);
        } else {
          packNames.add(parts[0]);
        }
      }
    });

    // Load README data for each package
    const packReadmeMap = new Map<string, ReadmeInfo>();
    for (const pack of Array.from(packNames)) {
      const info = await this.fetchAndParseReadme(pack);
      packReadmeMap.set(pack, info);
    }

    if (onLog) {
      onLog('info', 'CATEGORIZER', `Loaded deep scan configs for ${packNames.size} asset packs.`);
    }

    for (const asset of allAssets) {
      const meta = { ...asset.metadata };
      const idLower = meta.guid.toLowerCase();
      let changed = false;

      // 1. Determine pack ID to look up README rules
      let packId = '';
      const parts = meta.guid.split('/');
      if (parts.length > 1) {
        packId = parts[0] === 'assets' && parts.length > 2 ? parts[1] : parts[0];
      }
      const readmeInfo = packId ? packReadmeMap.get(packId) : null;

      // 2. Identify primary type (Sprite vs. TileSet) and sub-category
      let subCategory: AssetMetadata['subCategory'] = 'other';
      let primaryType: AssetMetadata['primaryType'] = 'Other';

      if (meta.type === 'audio') {
        subCategory = 'audio';
        primaryType = 'Audio';
      } else if (meta.type === 'image') {
        // High-precision keyword check for subCategory
        if (idLower.includes('background') || idLower.includes('backdrop') || idLower.includes('parallax') || idLower.includes('sky-background') || idLower.includes('mountain-background') || idLower.includes('rock-background')) {
          subCategory = 'background';
          primaryType = 'Sprite'; // Large images
        } else if (idLower.includes('character') || idLower.includes('warrior') || idLower.includes('boy') || idLower.includes('hero') || idLower.includes('enemy') || idLower.includes('actor') || idLower.includes('npc') || idLower.includes('ninja') || idLower.includes('player') || idLower.includes('faceset') || idLower.includes('animal') || idLower.includes('mount')) {
          subCategory = 'character';
          primaryType = 'Sprite';
        } else if (idLower.includes('tileset') || idLower.includes('terrain') || idLower.includes('map-tileset') || idLower.includes('tilemap') || idLower.includes('top-down-shooter/background/tileset')) {
          subCategory = 'tileset';
          primaryType = 'TileSet';
        } else if (idLower.includes('scenario') || idLower.includes('prop') || idLower.includes('chest') || idLower.includes('furniture') || idLower.includes('chair') || idLower.includes('lamp') || idLower.includes('door') || idLower.includes('window') || idLower.includes('fence') || idLower.includes('rock-') || idLower.includes('tree-') || idLower.includes('barrel') || idLower.includes('crate') || idLower.includes('bottle') || idLower.includes('bush') || idLower.includes('sign-') || idLower.includes('cactus') || idLower.includes('boulder') || idLower.includes('grave') || idLower.includes('chariot') || idLower.includes('items/')) {
          subCategory = 'scenario';
          primaryType = 'Sprite';
        } else if (idLower.includes('grid') || idLower.includes('cell') || idLower.includes('layout')) {
          subCategory = 'grid';
          primaryType = 'TileSet';
        } else if (idLower.includes('ui/') || idLower.includes('/hud/') || idLower.includes('/icons/') || idLower.includes('/menu/') || idLower.includes('/cursor') || idLower.includes('life-box') || idLower.includes('life-rectangle') || idLower.includes('/all.png') || idLower.includes('color-palette')) {
          subCategory = 'ui';
          primaryType = 'Sprite';
        } else if (idLower.includes('weapons/')) {
          subCategory = 'scenario'; // Weapon sprites
          primaryType = 'Sprite';
        } else {
          // General fallback heuristics based on README keywords if available
          if (readmeInfo?.keywords.includes('tileset') && (idLower.includes('tile') || idLower.includes('dirt') || idLower.includes('wall') || idLower.includes('ground') || idLower.includes('stone') || idLower.includes('floor') || idLower.includes('grass'))) {
            subCategory = 'tileset';
            primaryType = 'TileSet';
          } else if (readmeInfo?.keywords.includes('character') && (idLower.includes('soldier') || idLower.includes('beast') || idLower.includes('boss') || idLower.includes('fighter'))) {
            subCategory = 'character';
            primaryType = 'Sprite';
          } else {
            subCategory = 'other';
            primaryType = 'Sprite';
          }
        }
      }

      // 3. Write back primaryType and subCategory
      if (meta.primaryType !== primaryType || meta.subCategory !== subCategory) {
        meta.primaryType = primaryType;
        meta.subCategory = subCategory;
        changed = true;
      }

      // 4. Update tags dynamically to make them searchable and well-organized
      const tags = new Set(meta.tags || []);
      const oldSize = tags.size;

      // Add clean subcategory and primary type tags
      tags.add(subCategory);
      if (primaryType === 'Sprite') {
        tags.add('sprite');
        tags.delete('tileset');
      } else if (primaryType === 'TileSet') {
        tags.add('tileset');
        tags.delete('sprite');
      }

      // Add some structural keyword tags
      if (subCategory === 'character') tags.add('animated');
      if (subCategory === 'background') tags.add('parallax');
      if (subCategory === 'scenario') tags.add('prop');

      if (tags.size !== oldSize) {
        meta.tags = Array.from(tags);
        changed = true;
      }

      // 5. Automatically configure slicing dimensions based on parsed README dimensions!
      if (meta.type === 'image') {
        if (subCategory === 'character' && readmeInfo?.frameSize) {
          if (!meta.importOptions || !meta.importOptions.frameWidth || !meta.importOptions.frameHeight) {
            meta.importOptions = {
              ...meta.importOptions,
              frameWidth: readmeInfo.frameSize.width,
              frameHeight: readmeInfo.frameSize.height
            };
            changed = true;
            console.log(`[AssetCategorizer] Applied character frame sizes to "${meta.name}":`, readmeInfo.frameSize);
          }
        } else if (subCategory === 'tileset' && readmeInfo?.tileSize) {
          if (!meta.importOptions || !meta.importOptions.spriteSheet?.tileWidth) {
            meta.importOptions = {
              ...meta.importOptions,
              spriteSheet: {
                tileWidth: readmeInfo.tileSize.width,
                tileHeight: readmeInfo.tileSize.height,
                spacing: 0,
                margin: 0
              }
            };
            changed = true;
            console.log(`[AssetCategorizer] Applied tileset tile sizes to "${meta.name}":`, readmeInfo.tileSize);
          }
        }
      }

      if (changed) {
        meta.version = (meta.version || 1) + 1;
        await engine.assets.registerAsset(meta);
        reclassifiedCount++;
      }
    }

    if (onLog) {
      onLog('success', 'CATEGORIZER', `Deep scan completed. Recategorized and fully mapped ${reclassifiedCount} assets.`);
    }
    return reclassifiedCount;
  }
}
