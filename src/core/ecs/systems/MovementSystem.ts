import { System } from '../System';
import { World } from '../World';
import { Transform } from '../components/Transform';
import { Velocity } from '../components/Velocity';

export class MovementSystem implements System {
  public update(world: World, dt: number): void {
    const entities = world.getEntitiesWith('transform', 'velocity');
    for (const entity of entities) {
      const transform = world.getComponent<Transform>(entity, 'transform');
      const vel = world.getComponent<Velocity>(entity, 'velocity');
      if (transform && vel) {
        transform.x += vel.dx * dt;
        transform.y += vel.dy * dt;
        transform.rotation += vel.angularVelocity * dt;
      }
    }
  }
}
