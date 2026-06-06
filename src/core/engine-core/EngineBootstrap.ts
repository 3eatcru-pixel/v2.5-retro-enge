import { Engine } from './Engine';
import { World } from '../ecs/World';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { InputManager } from '../input/InputManager';
import { AssetManager } from '../resources/AssetManager';
import { AudioSystem } from '../audio/AudioSystem';
import { LocalizationSystem } from '../localization/LocalizationSystem';
import { PluginSystem } from '../plugin-system/PluginSystem';
import { BuildSystem } from '../build-system/BuildSystem';
import { SaveSystem } from '../save-system/SaveSystem';
import { WebPlatformAdapter } from '../../platform/web/WebAdapter';
import { CommandManager } from '../command-system/CommandManager';
import { ProjectManager } from '../project-system/ProjectManager';
import { PrefabManager } from '../prefabs/PrefabManager';
import { PackageManager } from '../plugin-system/PackageManager';
import { AnimationManager } from '../ecs/managers/AnimationManager';
import { SystemPipeline } from './SystemPipeline';

export class EngineBootstrap {
  public static mount(engine: Engine): SystemPipeline {
    engine.world = new World();
    engine.renderer = new CanvasRenderer();
    engine.input = new InputManager();
    engine.assets = new AssetManager();
    engine.audio = new AudioSystem();
    engine.localization = new LocalizationSystem();
    engine.commands = new CommandManager();
    engine.projects = new ProjectManager();
    engine.prefabs = new PrefabManager(engine);
    engine.plugins = new PluginSystem(engine);
    engine.packages = new PackageManager();
    engine.buildSystem = new BuildSystem(engine);
    engine.animations = new AnimationManager();
    
    const adapter = new WebPlatformAdapter();
    adapter.init().catch(err => console.error("Adapter initialization error:", err));
    engine.saveSystem = new SaveSystem(adapter);

    engine.services.register('world', engine.world);
    engine.services.register('renderer', engine.renderer);
    engine.services.register('input', engine.input);
    engine.services.register('assets', engine.assets);
    engine.services.register('audio', engine.audio);
    engine.services.register('localization', engine.localization);
    engine.services.register('commands', engine.commands);
    engine.services.register('projects', engine.projects);
    engine.services.register('prefabs', engine.prefabs);
    engine.services.register('packages', engine.packages);
    engine.services.register('animations', engine.animations);

    engine.assets.database.setAudioSystem(engine.audio);

    return new SystemPipeline(
      engine.renderer,
      engine.assets,
      engine.input,
      engine.animations
    );
  }
}
