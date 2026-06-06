import { World } from '../World';
import { System } from '../System';

export class SystemManager {
  private systems: System[] = [];

  public addSystem(system: System) {
    this.systems.push(system);
  }

  public update(world: World, dt: number) {
    for (const system of this.systems) {
      system.update(world, dt);
    }
  }

  public render(world: World, dt: number, selectedEntityId: number | null) {
    // Suppress unused warnings since this is a stub
    // _world, _dt, _selectedEntityId are intentional
    void world; void dt; void selectedEntityId;
    for (const system of this.systems) {
      void system;
    }
  }
}
