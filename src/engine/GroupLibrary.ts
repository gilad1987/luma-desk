import type { EngineBus } from './events';

/**
 * A named list of fixture ids in selection order. `name` stays mutable because the Label command renames a group in
 * place. Key order `name, ids` is part of the saved show file.
 */
export interface Group {
  name: string;
  ids: number[];
}

/** Groups by slot number (1-based). Empty slots have no key, which is how the pool shows them as empty. */
export type GroupPool = Record<number, Group>;

/**
 * The show's group pool. It owns the pool object so a loaded show or the demo can swap it whole, and so storing a
 * group always announces the change to the pool view and to persistence.
 */
export class GroupLibrary {
  #groups: GroupPool = {};
  readonly #bus: EngineBus;

  constructor(bus: EngineBus) {
    this.#bus = bus;
  }

  /** The live pool. Show save, the pool view and the command line read it; the Label command renames in place. */
  get all(): GroupPool {
    return this.#groups;
  }

  /**
   * Swaps in a whole pool (loaded show, demo, defaults). It announces nothing: the loader repaints and saves once,
   * after it has also replaced the presets.
   */
  replace(groups: GroupPool): void {
    this.#groups = groups;
  }

  /**
   * Stores `ids` (the selection) in `slot`. A stored-over group keeps its name; a new one is named after its slot.
   * An empty selection stores nothing and reports the error instead.
   */
  store(slot: number, ids: readonly number[]): void {
    if (!ids.length) {
      this.#bus.emit('message', { kind: 'log', text: 'Store Group: nothing selected', level: 'er' });
      return;
    }
    this.#groups[slot] = { name: this.#groups[slot]?.name || `Group ${slot}`, ids: [...ids] };
    this.#bus.emit('message', { kind: 'log', text: `Stored Group ${slot}`, level: 'ok' });
    this.#bus.emit('poolsChanged', undefined);
    this.#bus.emit('showChanged', undefined);
  }
}
