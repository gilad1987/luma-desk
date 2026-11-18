import type { Rig } from '../domain/rig';
import type { EngineBus } from './events';
import type { RigSource } from './stage/RigSource';

/** How a new id list combines with the current selection: replace it, add to it, remove from it, or flip each id. */
export type SelectMode = 'replace' | 'add' | 'sub' | 'toggle';

/**
 * The selected fixtures, in selection order. The order matters: fan values, position presets and phaser offsets
 * spread across the selection by index. Only ids the rig has are kept, because commands and saved groups can name
 * any number.
 *
 * With a `RigSource` (the StageService) it checks ids against the current rig and, on `rigChanged`, drops the ids the
 * new rig lacks (and emits `selectionChanged` only when it dropped one). A builder `preview` is not committed, so it
 * prunes nothing and Cancel gives the selection back, as the programmer keeps its values. Without a source it keeps the
 * rig it was given, as before the Stage Builder.
 */
export class Selection {
  #ids: number[] = [];
  #members = new Set<number>();
  readonly #rig: Rig;
  readonly #bus: EngineBus;
  readonly #source: RigSource | undefined;

  constructor(rig: Rig, bus: EngineBus, source?: RigSource) {
    this.#rig = rig;
    this.#bus = bus;
    this.#source = source;
    if (!source) return;
    bus.on('rigChanged', () => {
      if (source.cause !== 'preview') this.#prune(source.rig);
    });
  }

  /** The selected ids in selection order. A view: copy it before you keep it, the next change may alter it in place. */
  get ids(): readonly number[] {
    return this.#ids;
  }

  /** Whether a fixture is selected; the output merge asks this for every fixture each frame, so it is a set lookup. */
  has(id: number): boolean {
    return this.#members.has(id);
  }

  /**
   * Combines `ids` with the selection. `replace` drops duplicates and keeps first occurrences; `add` appends only new
   * ids; `sub` removes; `toggle` flips each id in turn, so a repeated id flips twice.
   */
  set(ids: readonly number[], mode: SelectMode = 'replace'): void {
    const rig = this.#source?.rig ?? this.#rig;
    const known = ids.filter((id) => rig.get(id) !== undefined);
    if (mode === 'replace') this.#ids = [...new Set(known)];
    else if (mode === 'add') {
      for (const id of known) if (!this.#ids.includes(id)) this.#ids.push(id);
    } else if (mode === 'sub') this.#ids = this.#ids.filter((id) => !known.includes(id));
    else if (mode === 'toggle') {
      for (const id of known)
        this.#ids = this.#ids.includes(id) ? this.#ids.filter((x) => x !== id) : [...this.#ids, id];
    }
    this.#members = new Set(this.#ids);
    this.#bus.emit('selectionChanged', undefined);
  }

  /** Reverses the selection order, which reverses fans and phaser offsets across the same fixtures. */
  reverse(): void {
    this.set([...this.#ids].reverse());
  }

  /** Drops the ids `rig` lacks; a rig change that keeps every selected fixture announces nothing, so nothing repaints. */
  #prune(rig: Rig): void {
    const kept = this.#ids.filter((id) => rig.get(id) !== undefined);
    if (kept.length !== this.#ids.length) this.set(kept);
  }
}
