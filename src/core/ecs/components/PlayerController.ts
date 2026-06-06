import { ComponentRegistry } from '../ComponentRegistry';

export interface PlayerController {
  speed: number;
}

export function createPlayerController(speed = 150): PlayerController {
  return { speed };
}

ComponentRegistry.register({
  name: 'playerController',
  createDefault: createPlayerController,
  fields: [
    { name: 'speed', type: 'number', label: 'Speed' }
  ]
});
