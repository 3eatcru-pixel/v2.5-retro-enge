import { Engine } from '../engine-core/Engine';
import { retroEventBus, emitEngineLog } from '../events/EventBus';
import { World } from '../ecs/World';
import { AssetDatabase } from '../resources/AssetDatabase';
import { LocalizationSystem } from '../localization/LocalizationSystem';
import { AudioSystem } from '../audio/AudioSystem';
import { InputManager } from '../input/InputManager';

export interface PluginPermissions {
  mutateWorld?: boolean;
  triggerEvents?: boolean;
  accessSensors?: boolean;
  modifyEngineConfig?: boolean;
}

export interface PluginContext {
  pluginId: string;
  pluginName: string;
  pluginVersion: string;
  
  world: World;
  events: typeof retroEventBus;
  assets: AssetDatabase;
  localization: LocalizationSystem;
  audio: AudioSystem;
  input: InputManager;
  
  readonly isRunning: boolean;
  readonly updateLogic: boolean;
  
  startEngine: () => void;
  stopEngine: () => void;
}

export interface EnginePlugin {
  id: string;
  name: string;
  version: string;
  permissions?: PluginPermissions;
  init: (context: PluginContext) => void;
  destroy?: (context: PluginContext) => void;
}

export class PluginSystem {
  private plugins: Map<string, EnginePlugin> = new Map();
  private sandboxes: Map<string, PluginContext> = new Map();
  
  constructor(private engine: Engine) {}

  private createSandbox(plugin: EnginePlugin): PluginContext {
    const engine = this.engine;
    const permissions = plugin.permissions || {
      mutateWorld: true,
      triggerEvents: true,
      accessSensors: true,
      modifyEngineConfig: false
    };

    // 1. Guarded Proxy for the ECS World interface
    const safeWorld = new Proxy(this.engine.world, {
      get: (target, prop) => {
        const propStr = String(prop);
        const isWorldMutation = ['createEntity', 'destroyEntity', 'addComponent', 'removeComponent'].some(method => propStr.startsWith(method));
        if (isWorldMutation && permissions.mutateWorld === false) {
          throw new Error(`[Security Error] Plugin "${plugin.id}" is unauthorized to mutate ECS World entities or components.`);
        }
        const val = (target as any)[prop];
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    }) as World;

    // 2. Guarded Proxy for the global Event Bus
    const safeEventBus = new Proxy(retroEventBus, {
      get: (target, prop) => {
        const propStr = String(prop);
        if (propStr === 'emit' && permissions.triggerEvents === false) {
          throw new Error(`[Security Error] Plugin "${plugin.id}" is unauthorized to emit global events.`);
        }
        if (propStr === 'clear') {
          throw new Error(`[Security Error] Plugins are forbidden from flushing the global EventBus handlers.`);
        }
        const val = (target as any)[prop];
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    }) as typeof retroEventBus;

    // 3. Structured sandboxed context returned to plugin scripts
    return {
      pluginId: plugin.id,
      pluginName: plugin.name,
      pluginVersion: plugin.version,
      
      // Isolated scopes
      world: safeWorld,
      events: safeEventBus,
      assets: new Proxy(this.engine.assets, {
        get: (target, prop) => {
          const allowedMethods = [
            'getAsset', 'getAssetData', 'getAssetMetadata', 'hasAsset', 'loadAsset', 'getAllAssets'
          ];
          const propStr = String(prop);
          if (typeof (target as any)[prop] === 'function') {
            if (!allowedMethods.includes(propStr)) {
              throw new Error(`[Security Error] Plugin "${plugin.id}" is unauthorized to perform administrative asset operation "${propStr}".`);
            }
            return (target as any)[prop].bind(target);
          }
          return (target as any)[prop];
        }
      }) as any,
      localization: new Proxy(this.engine.localization, {
        get: (target, prop) => {
          const allowedMethods = ['t', 'getLanguage', 'setLanguage'];
          const propStr = String(prop);
          if (typeof (target as any)[prop] === 'function') {
            if (!allowedMethods.includes(propStr)) {
              throw new Error(`[Security Error] Plugin "${plugin.id}" is unauthorized to perform administrative localization operation "${propStr}".`);
            }
            return (target as any)[prop].bind(target);
          }
          return (target as any)[prop];
        }
      }) as any,
      
      // Guarded Audio references
      audio: new Proxy(this.engine.audio, {
        get: (target, prop) => {
          const val = (target as any)[prop];
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
      }) as AudioSystem,

      // Guarded Input controls
      input: new Proxy(this.engine.input, {
        get: (target, prop) => {
          if (permissions.accessSensors === false) {
            throw new Error(`[Security Error] Plugin "${plugin.id}" is unauthorized to audit user input vectors or keystrokes.`);
          }
          const val = (target as any)[prop];
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
      }) as InputManager,

      // Read-only system constants
      get isRunning() { return engine.isRunning || false; }, // This keeps context bindings correct across proxies
      get updateLogic() { return engine.updateLogic || false; },

      // System altering wrappers
      startEngine: () => {
        if (!permissions.modifyEngineConfig) {
          throw new Error(`[Security Error] Plugin "${plugin.id}" cannot start the parent engine loop.`);
        }
        this.engine.start();
      },
      stopEngine: () => {
        if (!permissions.modifyEngineConfig) {
          throw new Error(`[Security Error] Plugin "${plugin.id}" cannot stop the parent engine loop.`);
        }
        this.engine.stop();
      }
    };
  }

  registerPlugin(plugin: EnginePlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered.`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
    
    // Build secure isolated sandbox
    const sandbox = this.createSandbox(plugin);
    this.sandboxes.set(plugin.id, sandbox);
    
    try {
      plugin.init(sandbox);
      console.log(`Plugin ${plugin.name} (v${plugin.version}) initialized successfully.`);
      emitEngineLog('success', 'PLUGINS', `🔌 Successfully registered plugin: ${plugin.name} (v${plugin.version})`);
    } catch (err: any) {
      console.error(`Error-Sandbox: Plugin "${plugin.id}" crashed during init():`, err);
      emitEngineLog('error', 'PLUGINS', `🚨 Plugin "${plugin.name}" crashed during init: ${err.message || err}`);
    }
  }

  removePlugin(id: string): void {
    const plugin = this.plugins.get(id);
    const sandbox = this.sandboxes.get(id);
    if (plugin) {
      try {
        if (plugin.destroy && sandbox) {
          plugin.destroy(sandbox);
        }
        console.log(`Plugin ${plugin.name} removed.`);
      } catch (err: any) {
        console.error(`Error-Sandbox: Plugin "${id}" crashed during destroy():`, err);
      }
      this.plugins.delete(id);
      this.sandboxes.delete(id);
    }
  }

  getPlugin(id: string): EnginePlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): EnginePlugin[] {
    return Array.from(this.plugins.values());
  }

  clear(): void {
    for (const id of Array.from(this.plugins.keys()).reverse()) {
      const plugin = this.plugins.get(id);
      const sandbox = this.sandboxes.get(id);
      try {
        if (plugin?.destroy && sandbox) {
          plugin.destroy(sandbox);
        }
      } catch (err: any) {
        console.error(`Plugin "${plugin?.id}" failed during cleanup:`, err);
      }
    }
    this.plugins.clear();
    this.sandboxes.clear();
  }
}
