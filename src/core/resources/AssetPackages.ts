import { Engine } from '../engine-core/Engine';
import { emitEngineLog } from '../events/EventBus';

export interface AssetPackage {
  id: string;
  name: string;
  description: string;
  icon: string;
  folderPrefix: string;
  bannerColor: string;
  itemCount: number;
  featuredTags: string[];
}

export const ASSET_PACKAGES: AssetPackage[] = [
  {
    id: 'ninja-adventure',
    name: '🛡️ Ninja RPG & Dungeons',
    description: 'Animated 16x16 top-down heroes, samurai warriors, slimes, foliage elements, items, chests, and dungeon decoration props.',
    icon: 'Sword',
    folderPrefix: 'assets/ninja-adventure/',
    bannerColor: 'from-emerald-900 to-indigo-950 border-emerald-500/20',
    itemCount: 85,
    featuredTags: ['character', 'ninja', 'props', 'item']
  },
  {
    id: 'space-shooter',
    name: '🚀 Cosmic Space Shooter',
    description: 'High-definition space fighter ship sprites, custom laser beams, power-ups, plasma shields, meteors, and cosmic debris.',
    icon: 'Rocket',
    folderPrefix: 'assets/space-shooter/',
    bannerColor: 'from-sky-900 to-slate-950 border-sky-500/20',
    itemCount: 42,
    featuredTags: ['ship', 'laser', 'projectile', 'scifi']
  },
  {
    id: 'rpg-battle-system',
    name: '⚔️ Retro RPG Battle Arena',
    description: 'Menu combat bars, health gages, special combat UI cards, battle arena backdrops, and active action indicators.',
    icon: 'Shield',
    folderPrefix: 'assets/rpg-battle-system/',
    bannerColor: 'from-amber-900 to-rose-950 border-amber-500/20',
    itemCount: 15,
    featuredTags: ['ui', 'battle', 'gauge', 'overlay']
  },
  {
    id: 'backgrounds',
    name: '🌌 Parallax Worlds & Skies',
    description: 'Premium layered aesthetic parallax screens spanning starry sky limits, green fields, active volcanoes, and glowing synthwave structures.',
    icon: 'Image',
    folderPrefix: 'assets/backgrounds/',
    bannerColor: 'from-purple-900 to-fuchsia-950 border-purple-500/20',
    itemCount: 90,
    featuredTags: ['backdrop', 'parallax', 'environment']
  },
  {
    id: 'western-fps-2d',
    name: '🤠 Wild West Gunfighter & Animals',
    description: 'A massive retro wildcard pack with cowboys, outlaws, mounts, wild cattle, items, pistols, sounds, and ambient wild west loops.',
    icon: 'Sword',
    folderPrefix: 'assets/western-fps-2d/',
    bannerColor: 'from-amber-950 to-orange-950 border-orange-500/20',
    itemCount: 618,
    featuredTags: ['cowboy', 'shooter', 'animals', 'sfx']
  }
];

/**
 * Downloads the assets-manifest, filters the items starting with prefix,
 * and registers them to the active engine instance.
 */
export async function installAssetPackage(engine: Engine, packageId: string) {
  const pack = ASSET_PACKAGES.find(p => p.id === packageId);
  if (!pack) return;

  try {
    const res = await fetch('/assets-manifest.json');
    const manifest = await res.json();
    
    const normPrefix = pack.folderPrefix.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    const matching = manifest.filter((item: any) => {
      const normId = item.id.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
      return normId.startsWith(normPrefix);
    });
    
    if (matching.length === 0) {
      emitEngineLog('warn', 'LIBRARY', `No asset entries found in manifest matching: ${pack.folderPrefix}`);
      return;
    }

    let installedCount = 0;
    for (const item of matching) {
      const normId = item.id.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
      const normUrl = item.url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
      // Check if already registered
      const exists = engine.assets.getAssetMetadata(normId);
      if (!exists) {
        let finalTags = [...(item.tags || []), pack.id, 'library-pack'];
        let importOptions: any = undefined;

        // Auto filter tags and add correct types for fluid animations
        finalTags = finalTags.filter(t => t !== 'sprite'); // clear arbitrary sprite tag

        const pathSegments = normId.split('/');
        // Remove 'assets', pack id, and filename
        const pureFolders = pathSegments.filter((s: string) => 
          s !== 'assets' && s !== pack.id && s !== pack.folderPrefix.replace(/\/$/, '') && !s.includes('.')
        );
        pureFolders.forEach((folder: string) => {
           finalTags.push(folder.toLowerCase());
        });

        const normIdLower = normId.toLowerCase();

        if (normIdLower.includes('tileset') || normIdLower.includes('background-elements/') || normIdLower.includes('background') || normIdLower.includes('scenario') || normIdLower.includes('environment')) {
          finalTags.push('tileset');
          finalTags.push('background');
        } else if (normIdLower.includes('characters/') || normIdLower.includes('hero') || normIdLower.includes('monster') || normIdLower.includes('player') || normIdLower.includes('enemies')) {
          finalTags.push('sprite');
          finalTags.push('character');
          if (normIdLower.includes('ninja-adventure/')) {
             importOptions = { frameWidth: 16, frameHeight: 28 };
          }
        } else if (normIdLower.includes('ships/') || normIdLower.includes('monsters/')) {
          finalTags.push('sprite');
        } else if (normIdLower.includes('items/') || normIdLower.includes('props/') || normIdLower.includes('objects/')) {
          finalTags.push('sprite');
          finalTags.push('item');
        } else if (normIdLower.includes('ui/')) {
           finalTags.push('ui');
        }

        if (item.type === 'audio') {
           finalTags.push('audio');
        }

        await engine.assets.registerAsset({
          guid: normId,
          type: item.type,
          name: normId.split('/').pop() || normId,
          sourceUrl: normUrl,
          dependencies: [],
          version: 1,
          importOptions,
          tags: Array.from(new Set(finalTags))
        });
        installedCount++;
      }
    }

    emitEngineLog('success', 'LIBRARY', `Successfully integrated package "${pack.name}": Imported ${installedCount} new assets!`);
  } catch (err) {
    console.error('Failed to install package', err);
    emitEngineLog('error', 'LIBRARY', `Error loading package elements: ${(err as any).message}`);
  }
}

/**
 * Removes registered assets that came from a specific package prefix.
 */
export function uninstallAssetPackage(engine: Engine, packageId: string) {
  const pack = ASSET_PACKAGES.find(p => p.id === packageId);
  if (!pack) return;

  const normPrefix = pack.folderPrefix.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
  const allAssets = engine.assets.getAllAssets();
  const toRemove = allAssets.filter(asset => {
    const normGuid = asset.metadata.guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    return normGuid.startsWith(normPrefix);
  });

  for (const asset of toRemove) {
    engine.assets.removeAsset(asset.metadata.guid);
  }

  emitEngineLog('info', 'LIBRARY', `Uninstalled package "${pack.name}": Cleared ${toRemove.length} assets.`);
}

/**
 * Checks if a specific package is installed (at least one of its assets exists in engine.assets).
 */
export function isPackageInstalled(engine: Engine, packageId: string): boolean {
  const pack = ASSET_PACKAGES.find(p => p.id === packageId);
  if (!pack) return false;
  
  const normPrefix = pack.folderPrefix.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
  const allAssets = engine.assets.getAllAssets();
  return allAssets.some(asset => {
    const normGuid = asset.metadata.guid.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
    return normGuid.startsWith(normPrefix);
  });
}

/**
 * Re-installs all currently installed asset packages, applying any new classification rules.
 */
export async function reinstallAllLibraryPacks(engine: Engine) {
  const installedPacks = ASSET_PACKAGES.filter(p => isPackageInstalled(engine, p.id));
  
  // Wipe all existing ones
  for (const pack of installedPacks) {
    uninstallAssetPackage(engine, pack.id);
  }
  
  // Reinstall
  for (const pack of installedPacks) {
    await installAssetPackage(engine, pack.id);
  }

  emitEngineLog('success', 'LIBRARY', `Successfully re-installed ${installedPacks.length} packs with fresh metadata extraction!`);
}
