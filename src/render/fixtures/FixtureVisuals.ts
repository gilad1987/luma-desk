import type { Object3D } from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { FixturePicker } from '../picking/FixturePicker';
import { Disposer } from '../shared';
import type { FixtureVisual } from './FixtureVisual';
import { FixtureVisualBuilder, type FixtureVisualDeps } from './FixtureVisualBuilder';
import type { FixtureVisualSync } from './FixtureVisualSync';
import type { GdtfBodySource } from './gdtf/GdtfBodySource';
import { releaseDeviceVisual, releaseLightVisual } from './releaseLightVisual';
import type { ScreenTargets } from './sync/syncScreen';

/** One LED screen of the stage, keyed by its screen fixture id: the mesh it picks and the targets it drives. */
export interface ScreenSlot {
  readonly mesh: Object3D;
  readonly targets: ScreenTargets;
}

/** The shared fixture kit (built once at boot) and the parts a rebuild hands the new visuals to. */
export interface FixtureVisualsDeps extends Omit<FixtureVisualDeps, 'screenMesh' | 'picker'> {
  readonly picker: Pick<FixturePicker, 'register' | 'clear'>;
  readonly sync: Pick<FixtureVisualSync, 'setVisuals'>;
}

/**
 * The fixture visuals of the current rig. A rebuild checks the new rig, disposes what the old visuals own, builds the
 * new rig in fixture array order (decision 24) and hands it to the frame update and the picker. The kit (models,
 * primitives, beam geometry, atlases) is kept, so rebuilding the same rig twice leaves the same resource count.
 * The screen meshes and their targets belong to the stage scene; this class never disposes them.
 */
export class FixtureVisuals {
  readonly #deps: FixtureVisualsDeps;
  readonly #disposer = new Disposer();
  #visuals: readonly FixtureVisual[] = [];
  #gdtf: GdtfBodySource | undefined;
  #last: [readonly Fixture[], ReadonlyMap<number, ScreenSlot>] | undefined;

  constructor(deps: FixtureVisualsDeps) {
    this.#deps = deps;
  }

  /** The current visuals, in fixture array order. */
  get visuals(): readonly FixtureVisual[] {
    return this.#visuals;
  }

  /**
   * Replaces the visuals with those of `fixtures`; `screens` holds a slot for each screen fixture id.
   * @throws Error when a screen fixture has no slot, or a fixture type has no model; the old visuals then stay.
   */
  rebuild(fixtures: readonly Fixture[], screens: ReadonlyMap<number, ScreenSlot>): readonly FixtureVisual[] {
    const meshes = new Map<number, Object3D>(),
      targets = new Map<number, ScreenTargets>();
    for (const [id, slot] of screens) {
      meshes.set(id, slot.mesh);
      targets.set(id, slot.targets);
    }
    const builder = new FixtureVisualBuilder({ ...this.#deps, screenMesh: meshes, gdtf: this.#gdtf });
    for (const f of fixtures) builder.assertBuildable(f);
    this.dispose();
    this.#last = [fixtures, screens];
    const visuals = fixtures.map((f) => builder.build(f));
    this.#deps.sync.setVisuals(visuals, targets);
    this.#visuals = visuals;
    return visuals;
  }

  /**
   * Sets where real GDTF bodies come from (undefined: nowhere) and rebuilds the current rig, so bodies that arrive
   * after the rig swap in, and picking and selection go on by fixture. Taking the source away rebuilds only a rig that drew from it.
   */
  setGdtf(source: GdtfBodySource | undefined): void {
    const used = this.#visuals.some((v) => (v.kind === 'device' ? v.pick.length > 0 : v.kind === 'light' && v.axisAt));
    this.#gdtf = source;
    if (this.#last && (source || used)) this.rebuild(...this.#last);
  }

  /**
   * Checks the light fixtures of a rig, so a stage rebuild can refuse the rig before it frees its old parts. Screen
   * fixtures are skipped: their walls are not built yet, and the stage drops a screen fixture without a wall.
   * @throws Error when a light type has no model or size.
   */
  assertBuildable(fixtures: readonly Fixture[]): void {
    const builder = new FixtureVisualBuilder({ ...this.#deps, screenMesh: new Map() });
    for (const f of fixtures) if (f.T.shape !== 'screen') builder.assertBuildable(f);
  }

  /** Removes every visual from the scene, frees what they own and leaves an empty rig in sync and picker. */
  dispose(): void {
    const { scene, picker, sync } = this.#deps;
    for (const v of this.#visuals) {
      if (v.kind === 'light') releaseLightVisual(v, scene, this.#disposer);
      if (v.kind === 'device') releaseDeviceVisual(v, scene, this.#disposer);
    }
    this.#disposer.dispose();
    picker.clear();
    sync.setVisuals([], new Map());
    this.#visuals = [];
    this.#last = undefined;
  }
}
