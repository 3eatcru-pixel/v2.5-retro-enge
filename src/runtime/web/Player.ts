import { Engine } from '../../core/engine-core/Engine';
import { SceneSerializer } from '../../core/project-system/SceneSerializer';

export class Player {
  private engine: Engine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine();
    this.engine.init(canvas);
  }

  public async loadProject(projectData: any) {
    console.log('[Player] Loading project data...', projectData);
    
    // 1. Load assets
    if (projectData.assets && Array.isArray(projectData.assets)) {
      for (const assetMeta of projectData.assets) {
         await this.engine.assets.registerAsset(assetMeta);
         await this.engine.assets.loadAsset(assetMeta.guid);
      }
    }

    // 2. Load prefabs
    if (projectData.prefabs && Array.isArray(projectData.prefabs)) {
        for (const prefab of projectData.prefabs) {
            this.engine.prefabs.registerPrefab(prefab);
        }
    }

    // 3. Load Main Scene
    if (projectData.scenes && projectData.scenes['main_scene']) {
        SceneSerializer.deserializeScene(this.engine, JSON.stringify(projectData.scenes['main_scene']));
    }
  }

  public start() {
    this.engine.start();
  }

  public stop() {
    this.engine.stop();
  }
}

