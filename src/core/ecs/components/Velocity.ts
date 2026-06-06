import { ComponentRegistry } from '../ComponentRegistry';

export interface Velocity {
  dx: number;
  dy: number;
  angularVelocity: number;
}

export function createVelocity(dx = 0, dy = 0, angularVelocity = 0): Velocity {
  return { dx, dy, angularVelocity };
}

ComponentRegistry.register({
  name: 'velocity',
  createDefault: createVelocity,
  fields: [
    { name: 'dx', type: 'number', label: 'dX' },
    { name: 'dy', type: 'number', label: 'dY' },
    { name: 'angularVelocity', type: 'number', label: 'AngVel' },
  ]
});
