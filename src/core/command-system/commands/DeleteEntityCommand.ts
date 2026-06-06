import { ICommand } from '../CommandManager';
import { Engine } from '../../engine-core/Engine';

export class DeleteEntityCommand implements ICommand {
  private engine: Engine;
  private entityId: number;
  private savedComponents: Record<string, any> = {};

  constructor(engine: Engine, entityId: number) {
    this.engine = engine;
    this.entityId = entityId;
  }

  execute() {
    // Save components before destroying
    this.savedComponents = this.engine.world.getComponentsForEntity(this.entityId);
    this.engine.world.destroyEntity(this.entityId);
  }

  undo() {
    this.engine.world.createEntity(this.entityId);
    // Restore components
    for (const [compName, compData] of Object.entries(this.savedComponents)) {
      this.engine.world.addComponent(this.entityId, compName as any, compData);
    }
  }
}
