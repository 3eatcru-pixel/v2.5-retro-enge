import { System } from '../System';
import { World } from '../World';
import { Transform } from '../components/Transform';
import { Hierarchy } from '../components/Hierarchy';

export class TransformSystem implements System {
  // Cash structures to avoid re-allocating inside update loop
  private rootEntities: number[] = [];
  
  public update(world: World, _dt: number): void {
    const transforms = world.getEntitiesWith('transform');
    
    this.rootEntities.length = 0;
    
    // Instead of instantiating Maps per frame, we use the component manager 
    // directly which is faster, or cache arrays. Since world.getComponent handles lookup, 
    // we bypass redundant Map allocation that causes GC spikes.
    for (const entity of transforms) {
      const hierarchy = world.getComponent<Hierarchy>(entity, 'hierarchy');
      if (!hierarchy || hierarchy.parent === null) {
          // It's a root
          this.rootEntities.push(entity);
      }
    }

    for (let i = 0; i < this.rootEntities.length; i++) {
        const root = this.rootEntities[i];
        const t = world.getComponent<Transform>(root, 'transform')!;
        
        // Root is directly mapped
        t.globalX = t.x;
        t.globalY = t.y;
        t.globalRotation = t.rotation;
        t.globalScaleX = t.scaleX;
        t.globalScaleY = t.scaleY;
        
        const h = world.getComponent<Hierarchy>(root, 'hierarchy');
        if (h && h.children && h.children.length > 0) {
            for (let j = 0; j < h.children.length; j++) {
               this.traverse(world, h.children[j], t.globalX, t.globalY, t.globalRotation, t.globalScaleX, t.globalScaleY);
            }
        }
    }
  }

  // Traverses keeping references out of loop inline
  private traverse(world: World, entity: number, parentGlobalX: number, parentGlobalY: number, parentGlobalRotation: number, parentGlobalScaleX: number, parentGlobalScaleY: number) {
        const transform = world.getComponent<Transform>(entity, 'transform');
        if (!transform) return;

        const cos = Math.cos(parentGlobalRotation);
        const sin = Math.sin(parentGlobalRotation);
        
        const scaledLocalX = transform.x * parentGlobalScaleX;
        const scaledLocalY = transform.y * parentGlobalScaleY;

        transform.globalX = parentGlobalX + (scaledLocalX * cos - scaledLocalY * sin);
        transform.globalY = parentGlobalY + (scaledLocalX * sin + scaledLocalY * cos);
        transform.globalRotation = parentGlobalRotation + transform.rotation;
        transform.globalScaleX = parentGlobalScaleX * transform.scaleX;
        transform.globalScaleY = parentGlobalScaleY * transform.scaleY;
        
        const hierarchy = world.getComponent<Hierarchy>(entity, 'hierarchy');
        if (hierarchy && hierarchy.children && hierarchy.children.length > 0) {
            for (let i = 0; i < hierarchy.children.length; i++) {
                this.traverse(world, hierarchy.children[i], transform.globalX, transform.globalY, transform.globalRotation, transform.globalScaleX, transform.globalScaleY);
            }
        }
  }
}
