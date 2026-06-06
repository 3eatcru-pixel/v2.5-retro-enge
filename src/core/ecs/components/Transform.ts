import { ComponentRegistry } from '../ComponentRegistry';

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  // Computed fields
  globalX: number;
  globalY: number;
  globalRotation: number;
  globalScaleX: number;
  globalScaleY: number;
}

export function createTransform(x = 0, y = 0, rotation = 0): Transform {
  return { 
    x, y, rotation, scaleX: 1, scaleY: 1,
    globalX: x, globalY: y, globalRotation: rotation, globalScaleX: 1, globalScaleY: 1
  };
}

ComponentRegistry.register({
  name: 'transform',
  createDefault: createTransform,
  fields: [
    { name: 'x', type: 'number', label: 'X' },
    { name: 'y', type: 'number', label: 'Y' },
    { name: 'rotation', type: 'number', label: 'Rot' },
    { name: 'scaleX', type: 'number', label: 'Scale X' },
    { name: 'scaleY', type: 'number', label: 'Scale Y' },
  ]
});
