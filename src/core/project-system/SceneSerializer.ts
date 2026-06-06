import { Engine } from '../engine-core/Engine';
import { PrefabSerializer } from '../prefabs/PrefabSerializer';
import { Entity } from '../ecs/World';

export interface SerializedScene {
  sceneId: string;
  name: string;
  timestamp: number;
  entities: any[]; // List of serialized prefab structures representing entities
}

export class SceneSerializer {
  /**
   * Serializes the active World entities of a scene into a JSON string
   */
  public static serializeScene(engine: Engine, sceneId: string, name: string, getEntityName?: (id: number) => string): string {
    const world = engine.world;
    const allEntities = world.getAllEntities();
    
    // Find only root entities (those that do not have a parent)
    const rootEntities: Entity[] = [];
    for (const entity of allEntities) {
      const hierarchy = world.getComponent(entity, 'hierarchy');
      if (!hierarchy || hierarchy.parent === null) {
        rootEntities.push(entity);
      }
    }

    // Capture each root entity and its nested children recursively
    const serializedEntities = rootEntities.map(entity => {
      // Get human-readable name or fallback
      const entityName = getEntityName ? getEntityName(entity) : `Entity_${entity}`;
      return PrefabSerializer.serializeEntity(engine, entity, entityName);
    });

    const scenePackage: SerializedScene = {
      sceneId,
      name,
      timestamp: Date.now(),
      entities: serializedEntities
    };

    return JSON.stringify(scenePackage, null, 2);
  }

  /**
   * Deserializes a scene, clears the ECS world, and fully restores the entity state
   */
  public static deserializeScene(engine: Engine, sceneJson: string): boolean {
    try {
      const parsed = JSON.parse(sceneJson) as SerializedScene;
      if (!parsed || !Array.isArray(parsed.entities)) {
        throw new Error('Invalid scene serialization format.');
      }

      const world = engine.world;
      
      // 1. Clear current world entities
      const allEntities = world.getAllEntities();
      for (const entity of allEntities) {
        world.destroyEntity(entity);
      }

      // 2. Instantiate each root serialized entity
      for (const entityPrefab of parsed.entities) {
        // Register the entity structure as a temporary prefab
        engine.prefabs.registerPrefab(entityPrefab);
        
        // Instantiate it recursively. It handles components, transforms,
        // and recursive parent-child nested prefab hierarchy automatically!
        engine.prefabs.instantiate(entityPrefab.id);
        
        // Clean up temporary prefab registration
        engine.prefabs.unregisterPrefab(entityPrefab.id);
      }

      console.log(`[SceneSerializer] Successfully loaded Scene "${parsed.name}" with ${parsed.entities.length} root nodes.`);
      return true;
    } catch (err) {
      console.error('[SceneSerializer] Deserialization of scene failed', err);
      return false;
    }
  }
}
