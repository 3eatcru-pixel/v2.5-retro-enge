import { Entity, World } from '../World';
import { Hierarchy } from '../components/Hierarchy';

export class HierarchyManager {
  /**
   * Sets the parent of a given entity.
   */
  public static setParent(world: World, child: Entity, parentId: Entity | null): void {
    const childHierarchy = world.getComponent<Hierarchy>(child, 'hierarchy');
    if (!childHierarchy) return;

    // Remove from old parent
    if (childHierarchy.parent !== null) {
      this.removeChild(world, childHierarchy.parent, child);
    }

    // Set new parent
    childHierarchy.parent = parentId;

    // Add to new parent
    if (parentId !== null) {
      this.addChild(world, parentId, child);
    }
  }

  /**
   * Adds a child safely to a parent.
   */
  private static addChild(world: World, parent: Entity, child: Entity): void {
    const parentHierarchy = world.getComponent<Hierarchy>(parent, 'hierarchy');
    if (parentHierarchy) {
      if (!parentHierarchy.children) {
        parentHierarchy.children = [];
      }
      if (!parentHierarchy.children.includes(child)) {
        parentHierarchy.children.push(child);
      }
    }
  }

  /**
   * Removes a child safely from a parent, creating a new array to prevent iteration errors if in loop.
   */
  public static removeChild(world: World, parent: Entity, child: Entity): void {
    const parentHierarchy = world.getComponent<Hierarchy>(parent, 'hierarchy');
    if (parentHierarchy && parentHierarchy.children) {
      parentHierarchy.children = parentHierarchy.children.filter((c: Entity) => c !== child);
    }
  }

  /**
   * Unlinks an entity completely from its hierarchy context.
   */
  public static unlink(world: World, entity: Entity): void {
    const hierarchy = world.getComponent<Hierarchy>(entity, 'hierarchy');
    if (!hierarchy) return;

    if (hierarchy.parent !== null) {
      this.removeChild(world, hierarchy.parent, entity);
      hierarchy.parent = null;
    }
    
    // Sever children from this entity
    if (hierarchy.children) {
      for (const child of hierarchy.children) {
        const childHierarchy = world.getComponent<Hierarchy>(child, 'hierarchy');
        if (childHierarchy) {
          childHierarchy.parent = null;
        }
      }
      hierarchy.children = [];
    }
  }
}
