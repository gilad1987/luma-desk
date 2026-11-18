import { FIXTURE_SOFT_LIMIT, type StageDesign } from '../../domain/stage/StageDesign';
import type { EngineBus } from '../events';
import type { RigChangeCause } from './rigChanged';

/**
 * The emit side of `StageService.apply`: which events a rig change sends, in which order, and the guard against a
 * listener that re-enters `apply` while they go out. It is apart from the service so the service keeps room for the
 * MVR `updateMeta` slot (contract G8) and holds only the rig state.
 *
 * Gets the `EngineBus` and the toast text for a rig above `FIXTURE_SOFT_LIMIT` from `StageService`.
 */
export class RigAnnouncer {
  readonly #bus: EngineBus;
  readonly #tooManyFixtures: (n: number) => string;
  /** The cause of the change that emits now; null between emits. */
  #emitting: RigChangeCause | null = null;

  constructor(bus: EngineBus, tooManyFixtures: (n: number) => string) {
    this.#bus = bus;
    this.#tooManyFixtures = tooManyFixtures;
  }

  /**
   * Called before the service changes any state, so a refused re-entry leaves the design of the running emit.
   * @throws Error when an emit runs: later listeners would get a stale design. This error also aborts the current
   * emit, so later listeners miss that event too; fail fast, as re-entry is a code bug.
   */
  checkIdle(cause: RigChangeCause): void {
    if (this.#emitting === null) return;
    throw new Error(`StageService.apply: a listener re-entered with ${cause} while the ${this.#emitting} apply emits`);
  }

  /**
   * Sends `rigChanged`, then `showChanged` for edits the operator keeps (`builder`, `import`), as a show load or a
   * preview is not a change to save, then the fixture toast above the soft limit, except for a preview, which the
   * operator has not committed to.
   */
  announce(design: StageDesign, cause: RigChangeCause, fixtureCount: number): void {
    this.#emitting = cause;
    try {
      this.#bus.emit('rigChanged', { design });
      if (cause === 'builder' || cause === 'import') this.#bus.emit('showChanged', undefined);
      if (fixtureCount > FIXTURE_SOFT_LIMIT && cause !== 'preview') {
        this.#bus.emit('message', { kind: 'toast', text: this.#tooManyFixtures(fixtureCount) });
      }
    } finally {
      this.#emitting = null;
    }
  }
}
