import { ICommand } from '../CommandManager';
import { Engine } from '../../engine-core/Engine';

export class ModifyComponentCommand implements ICommand {
  private engine: Engine;
  private entityId: number;
  private componentName: string;
  private patch: Record<string, any>;
  private originalValues: Record<string, any> = {};

  constructor(engine: Engine, entityId: number, componentName: string, patch: Record<string, any>) {
    this.engine = engine;
    this.entityId = entityId;
    this.componentName = componentName;
    this.patch = patch;
    
    // Save original values
    const comp = this.engine.world.getComponent(entityId, componentName);
    if (comp) {
      for (const key in patch) {
        this.originalValues[key] = (comp as any)[key];
      }
    }
  }

  execute() {
    const comp = this.engine.world.getComponent(this.entityId, this.componentName);
    if (comp) {
      for (const key in this.patch) {
        (comp as any)[key] = this.patch[key];
      }
    }
  }

  undo() {
    const comp = this.engine.world.getComponent(this.entityId, this.componentName);
    if (comp) {
      for (const key in this.originalValues) {
        (comp as any)[key] = this.originalValues[key];
      }
    }
  }
}
