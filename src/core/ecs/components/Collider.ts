import { ComponentRegistry } from '../ComponentRegistry';

export interface Collider {
  type: 'collider';
  shape: 'box' | 'circle';
  width: number;
  height: number;
  radius: number;
  offsetX: number;
  offsetY: number;
  isTrigger: boolean;
  layer: number;
  mask: number;
}

export function createCollider(
  shape: 'box' | 'circle' = 'box',
  width: number = 32,
  height: number = 32,
  radius: number = 16,
  offsetX: number = 0,
  offsetY: number = 0,
  isTrigger: boolean = false,
  layer: number = 1,
  mask: number = 1
): Collider {
  return {
    type: 'collider',
    shape,
    width,
    height,
    radius,
    offsetX,
    offsetY,
    isTrigger,
    layer,
    mask
  };
}

ComponentRegistry.register({
  name: 'collider',
  createDefault: createCollider as any,
  fields: [
    { name: 'shape', type: 'select', label: 'Shape', options: ['box', 'circle'] },
    { name: 'width', type: 'number', label: 'Width' },
    { name: 'height', type: 'number', label: 'Height' },
    { name: 'radius', type: 'number', label: 'Radius' },
    { name: 'offsetX', type: 'number', label: 'OffsetX' },
    { name: 'offsetY', type: 'number', label: 'OffsetY' },
    { name: 'layer', type: 'number', label: 'Layer' },
    { name: 'mask', type: 'number', label: 'Mask' },
    { name: 'isTrigger', type: 'boolean', label: 'Is Trigger' }
  ]
});
