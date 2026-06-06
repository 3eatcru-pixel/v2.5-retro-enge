import { Engine } from '../../core/engine-core/Engine';
import { SceneSerializer } from '../../core/project-system/SceneSerializer';
import { pushConsoleLog } from '../console-panel/ConsolePanel';
import { useEditorStore } from '../../state/editor.store';

export class ProjectExporter {
  public static getProjectBundle(engine: Engine, projectName: string): any {
    // 1. Serialize all active prefabs (some might be custom)
    const allPrefabs = engine.prefabs.getAllPrefabs();
    
    const getEntityName = (id: number) => {
      const names = useEditorStore.getState().entityNames;
      return names[id] || `Entity_${id}`;
    };

    // 2. Serialize the active scene
    const sceneData = SceneSerializer.serializeScene(engine, 'main_scene', 'Main Scene', getEntityName);

    // 3. Serialize Asset Database manifest
    const assets = engine.assets.getAllAssets().map(a => a.metadata);

    // Package everything into a mega JSON project file
    return {
      name: projectName,
      version: '1.0.0',
      timestamp: Date.now(),
      assets,
      prefabs: allPrefabs,
      scenes: {
        'main_scene': JSON.parse(sceneData)
      }
    };
  }

  public static async exportWebProject(engine: Engine, projectName: string) {
    pushConsoleLog('info', 'EXPORTER', `Starting Web export for project: ${projectName}...`);

    try {
      const projectBundle = this.getProjectBundle(engine, projectName);
      const projectJsonOutput = JSON.stringify(projectBundle, null, 2);

      // Trigger standard browser download for the JSON bundle
      const blob = new Blob([projectJsonOutput], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
      a.click();
      URL.revokeObjectURL(url);

      pushConsoleLog('success', 'EXPORTER', `Web export complete. Downloaded ${projectBundle.name}.json`);
    } catch (e) {
      pushConsoleLog('error', 'EXPORTER', `Web export failed: ${e}`);
    }
  }
}

