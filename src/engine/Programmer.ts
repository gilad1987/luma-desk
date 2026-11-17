import type { AttrName, Feature } from '../domain/attributes';
import type { FixtureValues } from './CueList';
import type { PresetType } from './presetTypes';
import * as actions from './programmerActions';
import type { ProgrammerDeps, StoreCueOptions } from './programmerActions';
import { indexFx, type FxIndex, type PhaserInstance, type PhaserType } from './shared';

/**
 * The operator's working look: values and phasers that override every executor until CLEAR. The field names `vals`,
 * `fxList` and `fx` are public API: the test hook `window.__desk.prog` exposes this object. Clearing replaces the three
 * objects, so readers look them up each time instead of keeping them. The rules of each operation live in
 * `programmerActions/`, one file each; a method here only hands that rule this programmer and its collaborators.
 */
export class Programmer {
  /** Values per fixture id; a fixture with no value left has no key. */
  vals: FixtureValues = {};
  /** The running phasers in creation order. A failed phaser apply can leave an emptied instance until the next edit. */
  fxList: PhaserInstance[] = [];
  /** The lookup the output merge reads; it is stale until {@link Programmer.reindexFx} runs after an `fxList` edit. */
  fx: FxIndex = {};
  /** Clock time (ms) of the last CLEAR press, so a quick second press is Clear All (see {@link actions.clearPress}). */
  #lastClear = 0;
  readonly #deps: ProgrammerDeps;

  constructor(deps: ProgrammerDeps) {
    this.#deps = deps;
  }

  /** Sets one attribute of one fixture (see {@link actions.setValue}). */
  set(id: number, attr: AttrName, value: number): void {
    actions.setValue(this.vals, this.#deps.rig, id, attr, value);
  }

  /** Knockout of one feature for `ids` (see {@link actions.removeFeature}). */
  removeFeature(ids: readonly number[], feat: Feature): void {
    actions.removeFeature(this, ids, feat);
  }

  /** Takes `ids` out of the phasers, all or those that drive `feat` (see {@link actions.removePhasers}). */
  removePhasers(ids: readonly number[], feat?: Feature): void {
    actions.removePhasers(this, ids, feat);
  }

  /** The phasers that drive at least one selected fixture; the phaser encoders edit these in place. */
  phasersOnSelection(): PhaserInstance[] {
    const sel = this.#deps.selection.ids;
    return this.fxList.filter((i) => i.ids.some((id) => sel.includes(id)));
  }

  /** Empties the programmer, so the executors alone drive the output. Selection and highlight stay. */
  clear(): void {
    this.vals = {};
    this.fxList = [];
    this.reindexFx();
  }

  /** Whether storing a cue would record anything. */
  hasContent(): boolean {
    return Object.keys(this.vals).length > 0 || this.fxList.length > 0;
  }

  /** Rebuilds {@link Programmer.fx} from `fxList`; a later instance wins a fixture feature. */
  reindexFx(): void {
    this.fx = {};
    for (const inst of this.fxList) indexFx(this.fx, inst);
  }

  /** Applies a preset to the selection (see {@link actions.applyPreset}). */
  applyPreset(type: PresetType, slot: number): void {
    actions.applyPreset(this, this.#deps, type, slot);
  }

  /** Starts a phaser on the selection (see {@link actions.applyPhaser}). */
  applyPhaser(type: PhaserType): void {
    actions.applyPhaser(this, this.#deps, type);
  }

  /** The fixtures a colour action applies to (see {@link actions.colorTargets}). */
  colorTargets(): number[] {
    return actions.colorTargets(this.#deps);
  }

  /** One press of the CLEAR key (see {@link actions.clearPress}). */
  clearPress(): void {
    this.#lastClear = actions.clearPress(this, this.#deps, this.#lastClear);
  }

  /** Clears selection, programmer and highlight (see {@link actions.clearAll}). */
  clearAll(): void {
    actions.clearAll(this, this.#deps);
  }

  /** Records the programmer into a cue (see {@link actions.storeCue}). */
  storeCue(exec: number, num: number | null, opts: StoreCueOptions = {}): void {
    actions.storeCue(this, this.#deps, exec, num, opts);
  }
}
