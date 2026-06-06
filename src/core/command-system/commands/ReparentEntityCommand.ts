import { ICommand } from '../CommandManager';
import { Engine } from '../../engine-core/Engine';

export class ReparentEntityCommand implements ICommand {
  private engine: Engine;
  private entityId: number;
  private newParentId: number | null;
  private oldParentId: number | null = null;
  
  constructor(engine: Engine, entityId: number, newParentId: number | null) {
    this.engine = engine;
    this.entityId = entityId;
    this.newParentId = newParentId;
  }

  execute() {
    const world = this.engine.world;
    
    // Ensure Hierarchy components exist
    const ensureHierarchy = (id: number) => {
      let h = world.getComponent(id, 'hierarchy');
      if (!h) {
        h = { parent: null, children: [] };
        world.addComponent(id, 'hierarchy', h);
      }
      return h;
    };

    const entityHierarchy = ensureHierarchy(this.entityId);
    this.oldParentId = entityHierarchy.parent;

    if (this.oldParentId === this.newParentId) return; // No change

    // Unlink from old parent
    if (this.oldParentId !== null) {
        const oldParentHierarchy = world.getComponent(this.oldParentId, 'hierarchy');
        if (oldParentHierarchy) {
            oldParentHierarchy.children = oldParentHierarchy.children.filter((c: number) => c !== this.entityId);
        }
    }

    entityHierarchy.parent = this.newParentId;

    // Link to new parent
    if (this.newParentId !== null) {
        const newParentHierarchy = ensureHierarchy(this.newParentId);
        if (!newParentHierarchy.children.includes(this.entityId)) {
            newParentHierarchy.children.push(this.entityId);
        }
    }
  }

  undo() {
    // Basic structural undo
    const cmd = new ReparentEntityCommand(this.engine, this.entityId, this.oldParentId);
    cmd.execute();
  }
}
