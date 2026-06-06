export type Entity = number;

export class EntityManager {
  private nextEntityId: number = 0;
  private entities: Set<Entity> = new Set();
  private freeEntityIds: Entity[] = [];
  
  public createEntity(id?: Entity): Entity {
    let finalId: Entity;
    if (id !== undefined) {
      finalId = id;
      if (finalId >= this.nextEntityId) {
        this.nextEntityId = finalId + 1;
      }
      this.freeEntityIds = this.freeEntityIds.filter(freeId => freeId !== finalId);
    } else {
      if (this.freeEntityIds.length > 0) {
        finalId = this.freeEntityIds.pop()!;
      } else {
        finalId = this.nextEntityId++;
      }
    }

    this.entities.add(finalId);
    return finalId;
  }

  public destroyEntity(entity: Entity): boolean {
    if (this.entities.has(entity)) {
      this.entities.delete(entity);
      this.freeEntityIds.push(entity);
      return true;
    }
    return false;
  }

  public getEntityCount(): number {
    return this.entities.size;
  }

  // Returns iterable, cached as set
  public getAllEntities(): ReadonlySet<Entity> {
    return this.entities;
  }

  public hasEntity(entity: Entity): boolean {
    return this.entities.has(entity);
  }
}
