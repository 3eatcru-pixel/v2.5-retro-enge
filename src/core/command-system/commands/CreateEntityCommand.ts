import { ICommand } from '../CommandManager';
import { Engine } from '../../engine-core/Engine';

export class CreateEntityCommand implements ICommand {
  private engine: Engine;
  private entityId: number | null = null;
  private componentsData: Record<string, any>;

  constructor(engine: Engine, componentsData: Record<string, any> = {}) {
    this.engine = engine;
    this.componentsData = componentsData;
  }

  execute() {
    if (this.entityId === null) {
      this.entityId = this.engine.world.createEntity();
    } else {
      this.engine.world.createEntity(this.entityId);
    }
    
    // Add components
    for (const [compName, compData] of Object.entries(this.componentsData)) {
      this.engine.world.addComponent(this.entityId, compName as any, compData);
    }
  }

  undo() {
    if (this.entityId !== null) {
      this.engine.world.destroyEntity(this.entityId);
    }
  }
}
