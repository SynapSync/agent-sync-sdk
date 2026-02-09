import type { SDKEventMap, EventBus, Unsubscribe } from '../types/events.js';

type Handler = (payload: unknown) => void;

export class EventBusImpl implements EventBus {
  private readonly handlers = new Map<string, Set<Handler>>();

  emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]): void {
    const set = this.handlers.get(event as string);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  on<K extends keyof SDKEventMap>(
    event: K,
    handler: (payload: SDKEventMap[K]) => void,
  ): Unsubscribe {
    const key = event as string;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    const set = this.handlers.get(key)!;
    const wrapped = handler as Handler;
    set.add(wrapped);
    return () => { set.delete(wrapped); };
  }

  once<K extends keyof SDKEventMap>(
    event: K,
    handler: (payload: SDKEventMap[K]) => void,
  ): Unsubscribe {
    const unsub = this.on(event, (payload) => {
      unsub();
      handler(payload);
    });
    return unsub;
  }
}

/** For tests: captures all emitted events in order */
export function createCapturingEventBus(): EventBus & {
  readonly events: Array<{ event: string; payload: unknown }>;
} {
  const events: Array<{ event: string; payload: unknown }> = [];
  const inner = new EventBusImpl();
  return {
    events,
    emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]) {
      events.push({ event: event as string, payload });
      inner.emit(event, payload);
    },
    on: inner.on.bind(inner),
    once: inner.once.bind(inner),
  };
}
