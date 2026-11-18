type Listener<P> = (payload: P) => void;

/** One subscription; a fresh object per `on`, so the same function subscribed twice is two independent entries. */
interface Subscription<P> {
  readonly listener: Listener<P>;
}

type SubscriptionTable<E> = { [K in keyof E]?: Set<Subscription<E[K]>> };

/**
 * Typed publish/subscribe bus that decouples the engine from the UI and persistence. The event map `E` belongs to the
 * publisher (declare it as a `type` alias: an `interface` has no index signature and does not satisfy the constraint).
 *
 * Delivery is synchronous and in subscribe order, because callers depend on it: the command line reads the feedback
 * the engine emitted before `runCmd` returns, and a log line must reach the DOM before the toast that follows it.
 *
 * Each `emit` iterates a snapshot of the listeners taken when it starts. A listener added during an emit is first
 * called by the next emit; one removed during an emit is still called by the current one if it had not run yet. A
 * listener that throws stops the emit and the error reaches the emitter, as a direct call would.
 */
export class EventBus<E extends Record<string, unknown>> {
  // no prototype, so an event named like an Object member (`constructor`, `toString`) is still an own, empty slot
  readonly #subscriptions = Object.create(null) as SubscriptionTable<E>;

  /** Subscribes `listener` to `type`; call the returned function to unsubscribe (calling it again does nothing). */
  on<K extends keyof E>(type: K, listener: (payload: E[K]) => void): () => void {
    const subscription: Subscription<E[K]> = { listener };
    const subscriptions = (this.#subscriptions[type] ??= new Set());
    subscriptions.add(subscription);
    return () => {
      subscriptions.delete(subscription);
    };
  }

  /** Calls every listener of `type` with `payload` before it returns. */
  emit<K extends keyof E>(type: K, payload: E[K]): void {
    const subscriptions = this.#subscriptions[type];
    if (subscriptions === undefined) return;
    for (const { listener } of [...subscriptions]) listener(payload);
  }
}
