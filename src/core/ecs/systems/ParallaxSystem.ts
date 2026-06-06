import { System } from '../System';
import { World } from '../World';
import { Transform } from '../components/Transform';
import { ParallaxLayer } from '../components/ParallaxLayer';
import { IRenderer } from '../../renderer/types';

export class ParallaxSystem implements System {
  constructor(private renderer: IRenderer) {}

  public update(world: World, _dt: number): void {
    const { x: camX, y: camY } = this.renderer.getCamera();
    const entities = world.getEntitiesWith('transform', 'parallaxLayer');

    for (const entity of entities) {
      const transform = world.getComponent<Transform>(entity, 'transform');
      const parallax = world.getComponent<ParallaxLayer>(entity, 'parallaxLayer');

      if (transform && parallax) {
        // Appends the camera offset to the calculated global transform
        if (transform.globalX !== undefined) {
          transform.globalX += camX * parallax.multiplierX;
        } else {
          transform.globalX = transform.x + camX * parallax.multiplierX;
        }

        if (transform.globalY !== undefined) {
          transform.globalY += camY * parallax.multiplierY;
        } else {
          transform.globalY = transform.y + camY * parallax.multiplierY;
        }
      }
    }
  }
}
