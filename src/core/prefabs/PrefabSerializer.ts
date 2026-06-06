import { Engine } from '../engine-core/Engine';
import { Entity } from '../ecs/World';
import { safeDeepClone } from '../utils/Cloning';

export interface SerializedPrefab {
  id: string;
  name: string;
  components: { [name: string]: any };
  children?: SerializedPrefab[];
}

export class PrefabSerializer {
  /**
   * Serializes an entity and all its recursive children in the hierarchy
   */
  public static serializeEntity(engine: Engine, entity: Entity, name: string): SerializedPrefab {
    const world = engine.world;

    // Get all components for this entity
    const rawComponents = world.getComponentsForEntity(entity);
    const components: { [name: string]: any } = {};

    for (const [key, val] of Object.entries(rawComponents)) {
      // Do not serialize parent/children pointers directly, as entity IDs change on instantiation
      if (key === 'hierarchy') {
        continue;
      }
      components[key] = safeDeepClone(val);
    }

    // Capture children recursively
    const children: SerializedPrefab[] = [];
    const hierarchy = world.getComponent(entity, 'hierarchy');
    if (hierarchy && hierarchy.children && hierarchy.children.length > 0) {
      for (const childId of hierarchy.children) {
        // Retrieve name of child if recorded in editor store or fallback
        const childName = `Entity_${childId}`;
        children.push(this.serializeEntity(engine, childId, childName));
      }
    }

    return {
      id: `prefab_${entity}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      components,
      children: children.length > 0 ? children : undefined,
    };
  }
}
