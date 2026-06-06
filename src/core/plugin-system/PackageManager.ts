export interface PackageManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: Record<string, string>;
  tags?: string[];
}

export class PackageManager {
  private installedPackages = new Map<string, PackageManifest>();
  private availableTemplates: PackageManifest[] = [
    {
      id: 'template-topdown-rpg',
      name: '⚔️ Topdown Action RPG Kit',
      version: '1.2.0',
      description: 'Preconfigured topdown RPG templates including simple dialogue schemas, equipment statistics, inventory, local loot bags and item database tables.',
      author: 'Retro Engine Core Team',
      tags: ['gameplay', 'rpg', 'topdown']
    },
    {
      id: 'template-sidescroller-platformer',
      name: '🏃 Retro Side-Scroller Platformer',
      version: '1.0.5',
      description: 'Configured platformer setup including high precision SAT collision solver, camera tracking, parallax layered backgrounds, animations, and coin pickups.',
      author: 'Retro Engine Core Team',
      tags: ['gameplay', 'platformer', 'physics']
    },
    {
      id: 'template-shmup-space',
      name: '🚀 Space Shoot\'Em Up Kit',
      version: '2.0.1',
      description: 'Retro game template focusing on horizontal/vertical background scrolling, bullet pooling, multiple laser weapons, obstacle paths, and asteroid spawner loops.',
      author: 'Retro Engine Core Team',
      tags: ['gameplay', 'shmup', 'space']
    }
  ];

  constructor() {
    // RPG template installed by default for RPG battlesystem workspace
    this.install(this.availableTemplates[0]);
  }

  install(manifest: PackageManifest) {
    if (this.installedPackages.has(manifest.id)) {
      console.warn(`Package ${manifest.id} is already installed.`);
      return;
    }
    
    // In a full implementation, this would load scripts and assets
    // associated with the package and merge them into the active project.
    this.installedPackages.set(manifest.id, manifest);
    console.log(`Package ${manifest.name} v${manifest.version} installed successfully.`);
  }

  uninstall(packageId: string) {
    if (this.installedPackages.has(packageId)) {
      this.installedPackages.delete(packageId);
      console.log(`Package ${packageId} uninstalled.`);
      // Would also clean up loaded assets/scripts in an actual implementation
    }
  }

  getInstalledPackages(): PackageManifest[] {
    return Array.from(this.installedPackages.values());
  }

  getAvailableTemplates(): PackageManifest[] {
    return this.availableTemplates;
  }

  hasPackage(packageId: string): boolean {
    return this.installedPackages.has(packageId);
  }
}
