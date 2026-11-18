import type { Rig } from '../../domain/rig/Rig';
import type { EngineBus } from '../../engine/events';
import type { Executor } from '../../engine/Executor';
import type { RigSource } from '../../engine/stage/RigSource';
import type { DemoShow } from '../DemoShow';
import { placeMvrFirstLook, type FirstLookPlacement } from '../mvrLook/placeMvrFirstLook';
import { dropForeignIds, type ShowIdParts } from './dropForeignIds';
import { isStartingShow } from './isStartingShow';
import { sameFixtureIds } from './sameFixtureIds';

/** What the starting show needs: the live stage, the demo loader and the show parts that store fixture ids. */
export interface StartingShowDeps extends Omit<ShowIdParts, 'execs'> {
  /** The live stage; read at each call, so `before` sees the stage before a change and the rest the one after. */
  readonly stage: RigSource;
  readonly demo: Pick<DemoShow, 'load'>;
  readonly execs: readonly Executor[];
  readonly bus: Pick<EngineBus, 'emit'>;
}

/** The show as it was before a rig change: the rig its ids were written for and whether it was a starting show. */
export interface ShowBefore {
  readonly rig: Rig;
  readonly starting: boolean;
}

/**
 * The show side of a rig change (an MVR import, back to the demo rig). Read `before` while the old stage is still
 * applied; afterwards either `build` the starting show for the new stage, or `keep` the operator's cues without the
 * values of fixtures that are gone or changed. The choice belongs to the caller, so a show the operator made is never
 * replaced without being asked.
 */
export class StartingShow {
  readonly #deps: StartingShowDeps;

  constructor(deps: StartingShowDeps) {
    this.#deps = deps;
  }

  /** The current show measured against the current stage; call it before the stage changes. */
  before(): ShowBefore {
    const { stage, execs } = this.#deps;
    return { rig: stage.rig, starting: isStartingShow(execs, stage) };
  }

  /** Replaces the show with the demo show of the current stage, as "Reload demo show" does. */
  build(): void {
    this.#deps.demo.load();
  }

  /** Puts the MVR first look of the current stage on executor 1 when that is free, else on the first empty one. */
  placeFirstLook(): FirstLookPlacement {
    const { stage, execs, bus } = this.#deps;
    return placeMvrFirstLook({ source: stage, execs, bus });
  }

  /** Keeps the operator's show, dropping every value and id that is not the same fixture on `rigBefore` and now. */
  keep(rigBefore: Rig): void {
    dropForeignIds(this.#deps, sameFixtureIds(rigBefore, this.#deps.stage.rig));
    this.#deps.bus.emit('showChanged', undefined);
  }
}
