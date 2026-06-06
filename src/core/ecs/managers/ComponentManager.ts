import { Entity } from './EntityManager';

export class ComponentManager {
  private components: Map<string, Map<Entity, any>> = new Map();
  private componentEntities: Map<string, Set<Entity>> = new Map();

  public addComponent(entity: Entity, componentName: string, data: any): void {
    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map<Entity, any>());
    }
    const map = this.components.get(componentName)!;
    
    if (map.has(entity)) {
      console.warn(`Component ${componentName} already exists on entity ${entity}. Overwriting silently.`);
    }
    
    map.set(entity, data);

    if (!this.componentEntities.has(componentName)) {
      this.componentEntities.set(componentName, new Set<Entity>());
    }
    const entitySet = this.componentEntities.get(componentName)!;
    entitySet.add(entity);
  }

  public replaceComponent(entity: Entity, componentName: string, data: any): void {
    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map<Entity, any>());
    }
    const map = this.components.get(componentName)!;
    map.set(entity, data);

    if (!this.componentEntities.has(componentName)) {
      this.componentEntities.set(componentName, new Set<Entity>());
    }
    const entitySet = this.componentEntities.get(componentName)!;
    entitySet.add(entity);
  }

  public getComponent<T>(entity: Entity, componentName: string): T | undefined {
    const map = this.components.get(componentName);
    if (!map) return undefined;
    return map.get(entity);
  }

  public removeComponent(entity: Entity, componentName: string): void {
    const map = this.components.get(componentName);
    if (map) {
      map.delete(entity);
    }
    const entitySet = this.componentEntities.get(componentName);
    if (entitySet) {
      entitySet.delete(entity);
    }
  }

  public entityDestroyed(entity: Entity): void {
    for (const componentMap of this.components.values()) {
      componentMap.delete(entity);
    }
    for (const entitySet of this.componentEntities.values()) {
      entitySet.delete(entity);
    }
  }

  public getEntitiesWith(...componentNames: string[]): Entity[] {
    if (componentNames.length === 0) return [];

    let smallestCompName = componentNames[0];
    let smallestSize = Infinity;

    for (const name of componentNames) {
      const set = this.componentEntities.get(name);
      const size = set ? set.size : 0;
      if (size < smallestSize) {
        smallestSize = size;
        smallestCompName = name;
      }
    }

    if (smallestSize === 0) return [];

    const smallestSet = this.componentEntities.get(smallestCompName)!;

    return Array.from(smallestSet).filter(entity => {
      for (const name of componentNames) {
        if (name === smallestCompName) continue;
        const set = this.componentEntities.get(name);
        if (!set || !set.has(entity)) {
          return false;
        }
      }
      return true;
    });
  }

  public getComponentsForEntity(entity: Entity): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [componentName, map] of this.components.entries()) {
      if (map.has(entity)) {
        result[componentName] = map.get(entity);
      }
    }
    return result;
  }
}
