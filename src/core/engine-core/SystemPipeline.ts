import { TransformSystem } from '../ecs/systems/TransformSystem';
import { RenderSystem } from '../ecs/systems/RenderSystem';
import { MovementSystem } from '../ecs/systems/MovementSystem';
import { PlayerSystem } from '../ecs/systems/PlayerSystem';
import { CameraSystem } from '../ecs/systems/CameraSystem';
import { PhysicsSystem } from '../ecs/systems/PhysicsSystem';
import { AnimationSystem } from '../ecs/systems/AnimationSystem';
import { ParallaxSystem } from '../ecs/systems/ParallaxSystem';
import { World } from '../ecs/World';

export class SystemPipeline {
  public transformSystem: TransformSystem;
  public renderSystem: RenderSystem;
  public movementSystem: MovementSystem;
  public physicsSystem: PhysicsSystem;
  public animationSystem: AnimationSystem;
  public playerSystem: PlayerSystem;
  public cameraSystem: CameraSystem;
  public parallaxSystem: ParallaxSystem;

  constructor(
    renderer: any,
    assets: any,
    input: any,
    animations: any
  ) {
    this.transformSystem = new TransformSystem();
    this.renderSystem = new RenderSystem(renderer, assets);
    this.movementSystem = new MovementSystem();
    this.physicsSystem = new PhysicsSystem();
    this.animationSystem = new AnimationSystem(animations);
    this.playerSystem = new PlayerSystem(input);
    this.cameraSystem = new CameraSystem(renderer);
    this.parallaxSystem = new ParallaxSystem(renderer);
  }

  public updateLogic(world: World, dt: number) {
    this.playerSystem.update(world, dt);
    this.movementSystem.update(world, dt);
    this.physicsSystem.update(world, dt);
  }

  public updateAnimation(world: World, dt: number) {
    this.animationSystem.update(world, dt);
  }

  public updateRender(world: World, alpha: number, engine?: any) {
    this.transformSystem.update(world, 0);
    this.cameraSystem.update(world, 0, engine);
    this.parallaxSystem.update(world, 0);
    this.renderSystem.update(world, alpha);
  }
}
