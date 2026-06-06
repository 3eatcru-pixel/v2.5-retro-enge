import { Engine } from '../engine-core/Engine';
import { Entity } from '../ecs/World';
import { HierarchyManager } from '../ecs/managers/HierarchyManager';
import { safeDeepClone } from '../utils/Cloning';

export interface Prefab {
  id: string;
  name: string;
  components: { [comType: string]: any };
  children?: Prefab[];
}

export class PrefabManager {
  private prefabs: Map<string, Prefab> = new Map();
  private engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  public registerPrefab(prefab: Prefab): void {
    if (!prefab || !prefab.id) {
      console.warn('[PrefabManager] Cannot register invalid prefab:', prefab);
      return;
    }
    this.prefabs.set(prefab.id, prefab);
  }

  public unregisterPrefab(id: string): void {
    this.prefabs.delete(id);
  }

  public getPrefab(id: string): Prefab | undefined {
    return this.prefabs.get(id);
  }

  public getAllPrefabs(): Prefab[] {
    return Array.from(this.prefabs.values());
  }

  /**
   * Instantiates a registered prefab by ID and returns the new Entity.
   */
  public instantiate(prefabId: string, parentId: Entity | null = null): Entity {
    const prefab = this.getPrefab(prefabId);
    if (!prefab) {
      throw new Error(`[PrefabManager] Prefab not found: ${prefabId}`);
    }
    return this.instantiatePrefabObject(prefab, parentId);
  }

  /**
   * Instantiates a prefab structure recursively.
   */
  public instantiatePrefabObject(prefab: Prefab, parentId: Entity | null = null): Entity {
    const world = this.engine.world;
    const newEntity = world.createEntity();

    // Add components from prefab template
    if (prefab.components) {
      for (const [compName, compData] of Object.entries(prefab.components)) {
        // Skip hierarchy as we build it dynamically
        if (compName === 'hierarchy') continue;
        const clonedData = safeDeepClone(compData);
        world.addComponent(newEntity, compName, clonedData);
      }
    }

    // Always ensure a hierarchy component exists on every entity to support nesting and scene views correctly
    if (!world.getComponent(newEntity, 'hierarchy')) {
      world.addComponent(newEntity, 'hierarchy', { parent: null, children: [] });
    }

    // Handle parenting
    if (parentId !== null) {
      HierarchyManager.setParent(world, newEntity, parentId);
    }

    // Recurse children
    if (prefab.children && Array.isArray(prefab.children)) {
      for (const childPrefab of prefab.children) {
        this.instantiatePrefabObject(childPrefab, newEntity);
      }
    }

    return newEntity;
  }
}
