import { World } from '../ecs/World';
import { GameLoop } from './GameLoop';
import { IRenderer } from '../renderer/types';
import '../ecs/components/ParallaxLayer';
import { InputManager } from '../input/InputManager';
import { AssetManager } from '../resources/AssetManager';
import { AudioSystem } from '../audio/AudioSystem';
import { LocalizationSystem } from '../localization/LocalizationSystem';
import { PluginSystem } from '../plugin-system/PluginSystem';
import { BuildSystem } from '../build-system/BuildSystem';
import { SaveSystem } from '../save-system/SaveSystem';
import { ServiceContainer } from './ServiceContainer';
import { CommandManager } from '../command-system/CommandManager';
import { ProjectManager } from '../project-system/ProjectManager';
import { PrefabManager } from '../prefabs/PrefabManager';
import { PackageManager } from '../plugin-system/PackageManager';
import { AnimationManager } from '../ecs/managers/AnimationManager';
import { SystemPipeline } from './SystemPipeline';
import { EngineBootstrap } from './EngineBootstrap';
import { retroEventBus } from '../events/EventBus';

export class Engine {
  public services: ServiceContainer;
  public world!: World;
  public renderer!: IRenderer;
  public input!: InputManager;
  public assets!: AssetManager;
  public audio!: AudioSystem;
  public localization!: LocalizationSystem;
  public plugins!: PluginSystem;
  public packages!: PackageManager;
  public buildSystem!: BuildSystem;
  public saveSystem!: SaveSystem;
  public commands!: CommandManager;
  public projects!: ProjectManager;
  public prefabs!: PrefabManager;
  public animations!: AnimationManager;

  private loop: GameLoop;
  
  public isRunning: boolean = false;
  public updateLogic: boolean = false; // Controls gameplay systems
  public pipeline!: SystemPipeline; // Expose pipeline publicly
  
  constructor() {
    this.services = new ServiceContainer();
    
    // Mount all static services, properties, and systems via Bootstrap
    this.pipeline = EngineBootstrap.mount(this);

    let frames = 0;
    let lastFpsTime = performance.now();

    this.loop = new GameLoop(
      (dt) => {
        this.input.update(); // Poll inputs

        if (this.updateLogic) {
          this.pipeline.updateLogic(this.world, dt);
          retroEventBus.emit('game-tick', { world: this.world, dt });
        }
        // Always run animations so preview works in editor without hitting global play
        this.pipeline.updateAnimation(this.world, dt);

        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
          retroEventBus.emit('engine-fps', { fps: frames });
          retroEventBus.emit('engine-entity-count', { count: this.world.getEntityCount() });
          frames = 0;
          lastFpsTime = now;
        }
      },
      (alpha: number) => {
        this.pipeline.updateRender(this.world, alpha, this);
        
        // Expose renderer so editor can draw interactive overlays (grid, selections) via IRenderer interface
        retroEventBus.emit('engine-post-render', { renderer: this.renderer });
        frames++;
      }
    );
  }

  public init(canvas: HTMLCanvasElement) {
    this.renderer.init(canvas);
    this.audio.init();
    
    // Core engine starting completely clean, syncing only user's registry mapped assets
    this.assets.syncWithRegistry();
    this.createTestPrefabs();
  }

  private createTestPrefabs() {
    console.log("No default prefabs registered. Starting with a 100% clean engine environment.");
  }

  public start() {
    this.isRunning = true;
    this.input.init();
    this.audio.resume();
    this.loop.start();
  }

  public stop() {
    this.isRunning = false;
    this.input.destroy();
    this.audio.suspend();
    this.loop.stop();
  }
}
