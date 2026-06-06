import { ComponentRegistry } from '../ComponentRegistry';

export interface Metadata {
  name: string;
  tag: string;
  layer: number;
}

export function createMetadata(name = 'New Entity'): Metadata {
  return { 
    name,
    tag: 'Untagged',
    layer: 0
  };
}

ComponentRegistry.register({
  name: 'metadata',
  createDefault: createMetadata,
  fields: [
    { name: 'name', type: 'string', label: 'Name' },
    { name: 'tag', type: 'string', label: 'Tag' },
    { name: 'layer', type: 'number', label: 'Layer' },
  ]
});
