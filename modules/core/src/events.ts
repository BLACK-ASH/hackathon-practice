import type {
  EventBus,
  EventHandler,
  Subscription,
} from '#contracts/events.ts';

export interface EventBusOptions<TEvents extends object> {
  /**
   * Called when a subscriber throws (or returns a rejected promise). Defaults
   * to console.error; a failure never prevents other subscribers running.
   */
  readonly onSubscriberError?: (error: unknown, type: keyof TEvents) => void;
}

type StoredHandler = (event: unknown) => unknown;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

export class TypedEventBus<TEvents extends object>
  implements EventBus<TEvents>
{
  private readonly handlers = new Map<keyof TEvents, Set<StoredHandler>>();
  private readonly onSubscriberError: (error: unknown, type: keyof TEvents) => void;

  constructor(options: EventBusOptions<TEvents> = {}) {
    this.onSubscriberError =
      options.onSubscriberError ??
      ((error, type) => {
        console.error(`[events] subscriber failed for "${String(type)}"`, error);
      });
  }

  on<K extends keyof TEvents>(
    type: K,
    handler: EventHandler<TEvents[K]>,
  ): Subscription {
    let set = this.handlers.get(type);
    if (set === undefined) {
      set = new Set();
      this.handlers.set(type, set);
    }
    const stored = handler as unknown as StoredHandler;
    set.add(stored);
    let active = true;
    return {
      unsubscribe: () => {
        if (!active) return;
        active = false;
        const current = this.handlers.get(type);
        if (current === undefined) return;
        current.delete(stored);
        if (current.size === 0) this.handlers.delete(type);
      },
    };
  }

  once<K extends keyof TEvents>(
    type: K,
    handler: EventHandler<TEvents[K]>,
  ): Subscription {
    let subscription: Subscription | undefined;
    const wrapped: EventHandler<TEvents[K]> = (event) => {
      subscription?.unsubscribe();
      handler(event);
    };
    subscription = this.on(type, wrapped);
    return subscription;
  }

  emit<K extends keyof TEvents>(type: K, event: TEvents[K]): void {
    const set = this.handlers.get(type);
    if (set === undefined) return;
    // Snapshot so subscribing/unsubscribing during dispatch cannot skip a
    // subscriber that was registered when the event started.
    for (const handler of [...set]) {
      try {
        const result = handler(event);
        if (isThenable(result)) {
          Promise.resolve(result).catch((error: unknown) => {
            this.onSubscriberError(error, type);
          });
        }
      } catch (error) {
        this.onSubscriberError(error, type);
      }
    }
  }

  listenerCount(type: keyof TEvents): number {
    return this.handlers.get(type)?.size ?? 0;
  }

  clear(type?: keyof TEvents): void {
    if (type === undefined) this.handlers.clear();
    else this.handlers.delete(type);
  }
}
