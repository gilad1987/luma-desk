import { FIXTURE_SOFT_LIMIT, type StageDesign } from '../../domain/stage/StageDesign';
import type { EngineBus } from '../events';
import type { RigChangeCause } from './rigChanged';

/** The `StageService` methods the re-entry guard protects. */
export type GuardedCall = 'apply' | 'updateMeta';

/**
 * The emit side of `StageService.apply` and `updateMeta`: which events a change sends, in which order, and the guard
 * against a listener that re-enters the service while they go out. It is apart from the service so the service holds
 * only the rig state.
 *
 * Gets the `EngineBus` and the toast text for a rig above `FIXTURE_SOFT_LIMIT` from `StageService`.
 */
export class RigAnnouncer {
  readonly #bus: EngineBus;
  readonly #tooManyFixtures: (n: number) => string;
  /** What emits now, as `builder apply` or `updateMeta`, for the error text; null between emits. */
  #emitting: string | null = null;

  constructor(bus: EngineBus, tooManyFixtures: (n: number) => string) {
    this.#bus = bus;
    this.#tooManyFixtures = tooManyFixtures;
  }

  /**
   * Called before the service changes any state, so a refused re-entry leaves the design of the running emit.
   * `call` and `detail` (the cause of an apply) name the refused call in the error.
   * @throws Error when an emit runs: later listeners would get a stale design. This error also aborts the current
   * emit, so later listeners miss that event too; fail fast, as re-entry is a code bug.
   */
  checkIdle(call: GuardedCall, detail: string): void {
    if (this.#emitting === null) return;
    throw new Error(`StageService.${call}: a listener re-entered with ${detail} while the ${this.#emitting} emits`);
  }

  /**
   * Sends `rigChanged`, then `showChanged` for edits the operator keeps (`builder`, `import`), as a show load or a
   * preview is not a change to save, then the fixture toast above the soft limit, except for a preview, which the
   * operator has not committed to.
   */
  announce(design: StageDesign, cause: RigChangeCause, fixtureCount: number): void {
    this.#guarded(`${cause} apply`, () => {
      this.#bus.emit('rigChanged', { design });
      if (cause === 'builder' || cause === 'import') this.#bus.emit('showChanged', undefined);
      if (fixtureCount > FIXTURE_SOFT_LIMIT && cause !== 'preview') {
        this.#bus.emit('message', { kind: 'toast', text: this.#tooManyFixtures(fixtureCount) });
      }
    });
  }

  /** Sends only `showChanged`, for a design change that keeps the rig (`StageService.updateMeta`, G8). */
  announceMeta(): void {
    this.#guarded('updateMeta', () => this.#bus.emit('showChanged', undefined));
  }

  #guarded(label: string, send: () => void): void {
    this.#emitting = label;
    try {
      send();
    } finally {
      this.#emitting = null;
    }
  }
}
