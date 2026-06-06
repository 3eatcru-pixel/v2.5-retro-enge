import { System } from '../System';
import { World } from '../World';
import { Transform } from '../components/Transform';
import { Camera } from '../components/Camera';
import { IRenderer } from '../../renderer/types';
import { Engine } from '../../engine-core/Engine';

export class CameraSystem implements System {
  constructor(private renderer: IRenderer) {}

  public update(world: World, _dt: number, engine?: Engine): void {
    if (engine && !engine.updateLogic) {
      // In editor mode (paused), do not override the camera.
      // We allow the SceneView's free-roaming editor camera to drive the renderer.
      return; 
    }

    const entities = world.getEntitiesWith('transform', 'camera');
    
    // Find first active camera
    for (const entity of entities) {
      const transform = world.getComponent<Transform>(entity, 'transform');
      const camera = world.getComponent<Camera>(entity, 'camera');
      
      if (transform && camera && camera.active) {
        this.renderer.setCamera(transform.x, transform.y, camera.zoom);
        return; // Only use the first active camera
      }
    }
  }
}
