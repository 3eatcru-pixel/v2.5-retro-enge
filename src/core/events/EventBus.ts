import { IRenderer } from '../renderer/types';

type EventHandler<T> = (data: T) => void;

export interface ConsoleLogEvent {
  id: string;
  time: string;
  type: 'info' | 'warn' | 'error' | 'success';
  module: string;
  text: string;
  details?: string;
}

interface ItemCreatedEvent {
  itemId: string;
  quantity?: number;
  action: 'added_to_stack' | 'added_to_new_slot' | 'bought' | 'sold';
  price?: number;
}

interface EventStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  xp: number;
  maxXp: number;
}

// --- EDITOR EVENTS ---
interface EditorEvents {
  'asset-added': string;
  'scene-loaded': string;
  'entity-selected': number | null;
  'editor-mode-changed': { mode: string };
  'theme-changed': { mode: 'light' | 'dark' };
}

// --- RUNTIME EVENTS ---
interface RuntimeEvents {
  'item-created': ItemCreatedEvent;
  'stats-changed': { type: string, amount: number, currentHp?: number, currentXp?: number };
  'entity-died': void;
  'level-up': { level: number, stats: EventStats };
  'dialogue-started': { treeId: string, startNodeId: string };
  'dialogue-node-changed': { nodeId: string };
  'dialogue-action': { actionEvent: string, nodeId: string };
  'dialogue-ended': { treeId: string };
  'language-changed': { language: string };
  'collision-enter': { entityA: number, entityB: number };
  'collision-damage': { entity: number, damage: number };
}

// --- GLOBAL EVENTS ---
interface GlobalEvents {
  'engine-log': ConsoleLogEvent;
  'game-tick': { world: any, dt: number };
  'engine-started': void;
  'engine-stopped': void;
  'engine-fps': { fps: number };
  'engine-entity-count': { count: number };
  'engine-post-render': { renderer: IRenderer };
}

// Unified Event Map
type EventMap = EditorEvents & RuntimeEvents & GlobalEvents;


class EventBus {
  private handlers: Map<keyof EventMap, EventHandler<any>[]> = new Map();
  private maxListeners: number = 30;

  public setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.push(handler);
    
    if (eventHandlers.length > this.maxListeners) {
      console.warn(`[EventBus Leak Warning] Event "${String(event)}" has ${eventHandlers.length} listeners. Potential memory leak detected.`);
    }
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      this.handlers.set(
        event,
        eventHandlers.filter((h) => h !== handler)
      );
    }
  }

  emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      // Loop over a shallow copy to prevent mutation during iteration
      [...eventHandlers].forEach((handler) => handler(data as EventMap[K]));
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  getListenerCount(event: keyof EventMap): number {
    return this.handlers.get(event)?.length || 0;
  }

  getTotalListenerCount(): number {
    let total = 0;
    this.handlers.forEach(handlers => total += handlers.length);
    return total;
  }
}

export const retroEventBus = new EventBus();

export function emitEngineLog(type: ConsoleLogEvent['type'], module: string, text: string, details?: string) {
  retroEventBus.emit('engine-log', {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    time: new Date().toLocaleTimeString(),
    type,
    module,
    text,
    details
  });
}
