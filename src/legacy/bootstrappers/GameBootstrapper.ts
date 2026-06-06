import { Engine } from '../../core/engine-core/Engine';

export function bootstrapEmeraldDungeon(engine: Engine) {
  const world = engine.world;

  // Clear existing entities
  for (const entity of world.getAllEntities()) {
    world.destroyEntity(entity);
  }

  // Create Player
  const player = world.createEntity();
  world.addComponent(player, 'transform', {
    x: 100, y: 150, rotation: 0, scaleX: 1, scaleY: 1,
    globalX: 100, globalY: 150, globalRotation: 0, globalScaleX: 1, globalScaleY: 1
  });
  world.addComponent(player, 'velocity', { dx: 0, dy: 0, angularVelocity: 0 });
  world.addComponent(player, 'sprite', {
    color: '#10b981', width: 32, height: 32, assetId: null, layer: 1
  });
  world.addComponent(player, 'playerController', { speed: 150 });
  world.addComponent(player, 'collider', {
    type: 'collider', shape: 'box', width: 32, height: 32, radius: 16, offsetX: 0, offsetY: 0, isTrigger: false, layer: 1, mask: 1
  });
  world.addComponent(player, 'hierarchy', { parent: null, children: [] });

  // Create Camera
  const camera = world.createEntity();
  world.addComponent(camera, 'transform', {
    x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
    globalX: 0, globalY: 0, globalRotation: 0, globalScaleX: 1, globalScaleY: 1
  });
  world.addComponent(camera, 'hierarchy', { parent: null, children: [] });
  world.addComponent(camera, 'camera', { zoom: 1, active: true });

  // Create an Obstacle
  const obstacle = world.createEntity();
  world.addComponent(obstacle, 'transform', {
    x: 250, y: 150, rotation: 0, scaleX: 1, scaleY: 1,
    globalX: 250, globalY: 150, globalRotation: 0, globalScaleX: 1, globalScaleY: 1
  });
  world.addComponent(obstacle, 'sprite', {
    color: '#fbbf24', width: 32, height: 32, assetId: null, layer: 1
  });
  world.addComponent(obstacle, 'collider', {
    type: 'collider', shape: 'box', width: 32, height: 32, radius: 16, offsetX: 0, offsetY: 0, isTrigger: false, layer: 1, mask: 1
  });
  world.addComponent(obstacle, 'hierarchy', { parent: null, children: [] });

  console.log('[GameBootstrapper] Emerald Dungeon bootstrapped successfully with player and camera.');
}
