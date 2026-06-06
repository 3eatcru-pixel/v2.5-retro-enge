import { Transform } from './components/Transform';
import { Velocity } from './components/Velocity';
import { Sprite } from './components/Sprite';
import { Collider } from './components/Collider';
import { Animator } from './components/Animator';
import { Camera } from './components/Camera';
import { PlayerController } from './components/PlayerController';
import { Tilemap } from './components/Tilemap';
import { Hierarchy } from './components/Hierarchy';
import { ParallaxLayer } from './components/ParallaxLayer';
import { EntityManager, Entity } from './managers/EntityManager';
import { ComponentManager } from './managers/ComponentManager';
import { QueryManager } from './QueryManager';
import { HierarchyManager } from './managers/HierarchyManager';

export type { Entity };

export enum ComponentType {
  Transform = 'transform',
  Velocity = 'velocity',
  Sprite = 'sprite',
  Collider = 'collider',
  Animator = 'animator',
  Camera = 'camera',
  PlayerController = 'playerController',
  Tilemap = 'tilemap',
  Hierarchy = 'hierarchy',
  ParallaxLayer = 'parallaxLayer'
}

export interface ComponentDataMap {
  [ComponentType.Transform]: Transform;
  [ComponentType.Velocity]: Velocity;
  [ComponentType.Sprite]: Sprite;
  [ComponentType.Collider]: Collider;
  [ComponentType.Animator]: Animator;
  [ComponentType.Camera]: Camera;
  [ComponentType.PlayerController]: PlayerController;
  [ComponentType.Tilemap]: Tilemap;
  [ComponentType.Hierarchy]: Hierarchy;
  [ComponentType.ParallaxLayer]: ParallaxLayer;
  [key: string]: any;
}

export class World {
  private entityManager: EntityManager;
  private componentManager: ComponentManager;
  private queryManager: QueryManager;

  constructor() {
    this.entityManager = new EntityManager();
    this.componentManager = new ComponentManager();
    this.queryManager = new QueryManager();
  }

  public createEntity(id?: Entity): Entity {
    return this.entityManager.createEntity(id);
  }

  public destroyEntity(entity: Entity): void {
    // Collect entities to destroy recursively to avoid modifying graph during iteration
    const toDestroy = new Set<Entity>();
    
    const collectRecursively = (e: Entity) => {
      if (toDestroy.has(e)) return;
      toDestroy.add(e);
      const hierarchy = this.getComponent(e, 'hierarchy');
      if (hierarchy && hierarchy.children) {
        for (const child of hierarchy.children) {
          collectRecursively(child);
        }
      }
    };
    
    collectRecursively(entity);

    for (const e of toDestroy) {
      // Unlink from parent if any
      const hierarchy = this.getComponent(e, 'hierarchy');
      if (hierarchy && hierarchy.parent !== null) {
        HierarchyManager.removeChild(this, hierarchy.parent, e);
      }

      if (this.entityManager.destroyEntity(e)) {
        this.queryManager.onEntityDestroyed(e);
        this.componentManager.entityDestroyed(e);
      }
    }
  }

  public addComponent<K extends keyof ComponentDataMap>(entity: Entity, componentName: K, data: ComponentDataMap[K]): void;
  public addComponent<T>(entity: Entity, componentName: string, data: T): void;
  public addComponent(entity: Entity, componentName: ComponentType | string, data: any): void {
    const compNameStr = typeof componentName === 'string' ? componentName : (componentName as string);
    this.componentManager.addComponent(entity, compNameStr, data);
    this.queryManager.onComponentAdded(entity, compNameStr, this.componentManager);
  }

  public getComponent<K extends keyof ComponentDataMap>(entity: Entity, componentName: K): ComponentDataMap[K] | undefined;
  public getComponent<T>(entity: Entity, componentName: string): T | undefined;
  public getComponent(entity: Entity, componentName: ComponentType | string): any | undefined {
    const compNameStr = typeof componentName === 'string' ? componentName : (componentName as string);
    return this.componentManager.getComponent(entity, compNameStr);
  }

  public removeComponent(entity: Entity, componentName: ComponentType | string): void {
    const compNameStr = typeof componentName === 'string' ? componentName : (componentName as string);
    this.componentManager.removeComponent(entity, compNameStr);
    this.queryManager.onComponentRemoved(entity, compNameStr);
  }

  public getEntitiesWith(...componentNames: (ComponentType | string)[]): ReadonlySet<Entity> {
    if (componentNames.length === 0) return this.entityManager.getAllEntities();
    return this.queryManager.query(componentNames as string[], this.componentManager);
  }

  public getEntityCount(): number {
    return this.entityManager.getEntityCount();
  }

  public getAllEntities(): ReadonlySet<Entity> {
    return this.entityManager.getAllEntities();
  }

  public getComponentsForEntity(entity: Entity): Record<string, any> {
    return this.componentManager.getComponentsForEntity(entity);
  }
}

