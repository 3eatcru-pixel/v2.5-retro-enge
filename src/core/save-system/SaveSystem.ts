import { PlatformAdapter } from '../../platform/PlatformAdapter';
import { World } from '../ecs/World';
import { safeDeepClone } from '../utils/Cloning';

export interface SaveData {
  version: string;
  timestamp: number;
  entities: {
    id: number;
    components: Record<string, any>;
  }[];
  activeSceneId: string;
  playerInventory?: any;
  playerStats?: any;
  questStates?: any;
}

export class SaveSystem {
  private readonly SAVE_VERSION = '1.0.0';

  constructor(private adapter: PlatformAdapter) {}

  /**
   * Serializes the entire ECS World state along with relevant gameplay structures 
   * and saves it persistently to the adapter (IndexedDB or LocalStorage).
   */
  async saveGame(slotId: string, world?: World, activeSceneId?: string, customData?: any): Promise<void> {
    const resolvedWorld = world || (window as any).world as World | undefined;
    const resolvedSceneId = activeSceneId || 'scene-level-1';

    if (!resolvedWorld) {
      console.warn('SaveSystem: No active ECS World instance discovered to serialize.');
    }

    const serializedEntities: SaveData['entities'] = [];
    if (resolvedWorld) {
      const allEntities = resolvedWorld.getAllEntities();
      for (const eid of allEntities) {
        const components = resolvedWorld.getComponentsForEntity(eid);
        serializedEntities.push({
          id: eid,
          components: safeDeepClone(components) // deep clone components safely
        });
      }
    }

    const data: SaveData = {
      version: this.SAVE_VERSION,
      timestamp: Date.now(),
      entities: serializedEntities,
      activeSceneId: resolvedSceneId,
      playerInventory: customData?.inventory || [],
      playerStats: customData?.stats || {},
      questStates: customData?.quests || {}
    };

    const serialized = JSON.stringify(data);
    await this.adapter.saveData(`save_slot_${slotId}`, serialized);
    console.log(`Game state successfully serialized & stored in slot "${slotId}"`);
  }

  /**
   * Reads serialized game state from the storage adapter, performs schema/version migrations,
   * purges current ECS world, and fully hydrates entities with their component states.
   */
  async loadGame(slotId: string, world?: World): Promise<SaveData | null> {
    const serialized = await this.adapter.loadData(`save_slot_${slotId}`);
    if (!serialized) {
      console.warn(`SaveSystem: No save data found in slot "${slotId}".`);
      return null;
    }

    try {
      const data: SaveData = JSON.parse(serialized);
      
      // -- Migration System --
      if (data.version !== this.SAVE_VERSION) {
        console.log(`SaveSystem: Migrating save data from version ${data.version} to ${this.SAVE_VERSION}`);
        this.migrateSaveData(data);
      }

      const resolvedWorld = world || (window as any).world as World | undefined;
      if (resolvedWorld) {
        // Clear all current entities in the world
        const currentEntities = resolvedWorld.getAllEntities();
        for (const eid of currentEntities) {
          resolvedWorld.destroyEntity(eid);
        }

        // Hydrate and reconstruct all serialized entities with their components
        for (const entityDef of data.entities) {
          const newEntityId = resolvedWorld.createEntity(entityDef.id);
          
          for (const [compName, compData] of Object.entries(entityDef.components)) {
            resolvedWorld.addComponent(newEntityId, compName, compData);
          }
        }
        console.log(`SaveSystem: Hydrated ${data.entities.length} entities into the ECS World successfully.`);
      }

      console.log(`Game loaded from slot "${slotId}" (Version: ${data.version})`);
      return data;
    } catch (e) {
      console.error('Failed to parse save data', e);
      return null;
    }
  }

  /**
   * Safe migration routine for handling schema updates or missing properties
   */
  private migrateSaveData(data: SaveData): void {
    if (data.version === '0.9.0' || !data.version) {
      for (const ent of data.entities) {
        if (ent.components.transform) {
          if (ent.components.transform.scaleX === undefined) ent.components.transform.scaleX = 1;
          if (ent.components.transform.scaleY === undefined) ent.components.transform.scaleY = 1;
        }
      }
    }
    data.version = this.SAVE_VERSION;
  }
}
