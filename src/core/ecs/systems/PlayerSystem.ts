import { System } from '../System';
import { World } from '../World';
import { Velocity } from '../components/Velocity';
import { PlayerController } from '../components/PlayerController';
import { InputManager } from '../../input/InputManager';

export class PlayerSystem implements System {
  constructor(private input: InputManager) {}

  public update(world: World, _dt: number): void {
    const entities = world.getEntitiesWith('transform', 'velocity', 'playerController');
    
    for (const entity of entities) {
      const vel = world.getComponent<Velocity>(entity, 'velocity');
      const player = world.getComponent<PlayerController>(entity, 'playerController');
      
      if (vel && player) {
        let dx = 0;
        let dy = 0;
        
        if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW')) dy -= 1;
        if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS')) dy += 1;
        if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA')) dx -= 1;
        if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD')) dx += 1;

        // Normalize
        if (dx !== 0 && dy !== 0) {
          const length = Math.sqrt(dx * dx + dy * dy);
          dx /= length;
          dy /= length;
        }

        vel.dx = dx * player.speed;
        vel.dy = dy * player.speed;
      }
    }
  }
}
