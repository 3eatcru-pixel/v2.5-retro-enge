import { ComponentRegistry } from '../ComponentRegistry';

export interface Camera {
  zoom: number;
  active: boolean;
}

export function createCamera(zoom = 1, active = true): Camera {
  return { zoom, active };
}

ComponentRegistry.register({
  name: 'camera',
  createDefault: createCamera,
  fields: [
    { name: 'zoom', type: 'number', label: 'Zoom' },
    { name: 'active', type: 'boolean', label: 'Active' },
  ]
});
