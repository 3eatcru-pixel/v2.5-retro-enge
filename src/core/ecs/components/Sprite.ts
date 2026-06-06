import { ComponentRegistry } from '../ComponentRegistry';

export interface Sprite {
  color: string;
  width: number;
  height: number;
  assetId: string | null;
  layer?: number; // Sorting layer
  // Slicing properties for sprite atlas / spritesheets
  frameX?: number; 
  frameY?: number; 
  frameWidth?: number; 
  frameHeight?: number; 
}

export function createSprite(width = 32, height = 32, color = '#ff00ff', assetId: string | null = null): Sprite {
  return { color, width, height, assetId, layer: 0 };
}

ComponentRegistry.register({
  name: 'sprite',
  createDefault: createSprite,
  fields: [
    { name: 'width', type: 'number', label: 'Width' },
    { name: 'height', type: 'number', label: 'Height' },
    { name: 'assetId', type: 'asset', assetType: 'image', label: 'Asset ID' },
    { name: 'color', type: 'color', label: 'Color' },
    { name: 'layer', type: 'number', label: 'Layer' },
    { name: 'frameX', type: 'number', label: 'Frame X' },
    { name: 'frameY', type: 'number', label: 'Frame Y' },
    { name: 'frameWidth', type: 'number', label: 'Frame W' },
    { name: 'frameHeight', type: 'number', label: 'Frame H' },
  ]
});
