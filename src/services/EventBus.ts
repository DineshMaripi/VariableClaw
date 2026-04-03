import { AppEvent } from '../types/agents';

/**
 * EventBus — lightweight typed pub/sub for inter-agent communication.
 * Agents emit events, other agents/services subscribe and react.
 *
 * No external deps. Synchronous within JS thread.
 */

type EventType = AppEvent['type'];
type EventOfType<T extends EventType> = Extract<AppEvent, { type: T }>;
type Listener<T extends EventType> = (event: EventOfType<T>) => void;

class EventBusService {
  private listeners = new Map<string, Set<Function>>();

  /** Subscribe to an event type. Returns unsubscribe function. */
  on<T extends EventType>(type: T, listener: Listener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /** Emit an event to all subscribers. */
  emit(event: AppEvent): void {
    const set = this.listeners.get(event.type);
    if (set) {
      set.forEach(listener => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EventBus] Listener error for ${event.type}:`, err);
        }
      });
    }
  }

  /** Remove all listeners (for cleanup/testing). */
  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBusService();
