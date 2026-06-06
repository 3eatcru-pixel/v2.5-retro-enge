import { Engine } from '../../core/engine-core/Engine';

export function bootstrapCyberNinjaEscape(engine: Engine) {
  const world = engine.world;

  // Clear existing entities
  for (const entity of world.getAllEntities()) {
    world.destroyEntity(entity);
  }

  // Create Cyber Ninja Player
  const player = world.createEntity();
  world.addComponent(player, 'transform', {
    x: 150, y: 150, rotation: 0, scaleX: 1, scaleY: 1,
    globalX: 150, globalY: 150, globalRotation: 0, globalScaleX: 1, globalScaleY: 1
  });
  world.addComponent(player, 'velocity', { dx: 0, dy: 0, angularVelocity: 0 });
  world.addComponent(player, 'sprite', {
    color: '#a855f7', width: 32, height: 32, assetId: null, layer: 2
  });
  world.addComponent(player, 'playerController', { speed: 200 }); // Slightly faster ninja speed
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
  world.addComponent(camera, 'camera', { zoom: 1.2, active: true }); // Higher camera zoom

  // Create Neon Barrier
  const barrier = world.createEntity();
  world.addComponent(barrier, 'transform', {
    x: 350, y: 150, rotation: 45, scaleX: 1, scaleY: 3,
    globalX: 350, globalY: 150, globalRotation: 45, globalScaleX: 1, globalScaleY: 3
  });
  world.addComponent(barrier, 'sprite', {
    color: '#06b6d4', width: 16, height: 48, assetId: null, layer: 1
  });
  world.addComponent(barrier, 'collider', {
    type: 'collider', shape: 'box', width: 16, height: 48, radius: 8, offsetX: 0, offsetY: 0, isTrigger: false, layer: 1, mask: 1
  });
  world.addComponent(barrier, 'hierarchy', { parent: null, children: [] });

  console.log('[CyberNinjaBootstrapper] Cyber Ninja Escape bootstrapped successfully.');
}
