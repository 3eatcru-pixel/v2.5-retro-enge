import { ComponentRegistry } from '../ComponentRegistry';
import { Entity } from '../managers/EntityManager';

export interface Hierarchy {
  parent: Entity | null;
  children: Entity[];
}

export function createHierarchy(parent: Entity | null = null, children: Entity[] = []): Hierarchy {
  return { parent, children };
}

ComponentRegistry.register({
  name: 'hierarchy',
  createDefault: () => createHierarchy(),
  fields: [] // Hidden from default inspector for now, handle via HierarchyPanel
});
