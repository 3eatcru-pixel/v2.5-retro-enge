import { ComponentRegistry } from '../ComponentRegistry';

export interface ParallaxLayer {
  multiplierX: number;
  multiplierY: number;
}

export function createParallaxLayer(multiplierX = 0.5, multiplierY = 0.5): ParallaxLayer {
  return { multiplierX, multiplierY };
}

ComponentRegistry.register({
  name: 'parallaxLayer',
  createDefault: createParallaxLayer,
  fields: [
    { name: 'multiplierX', type: 'slider', label: 'Scroll X', min: -2, max: 2, step: 0.05 },
    { name: 'multiplierY', type: 'slider', label: 'Scroll Y', min: -2, max: 2, step: 0.05 },
  ]
});
