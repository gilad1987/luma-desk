import type { Rig } from '../domain/rig';
import type { AppState } from '../engine/AppState';
import type { EngineBus } from '../engine/events';
import type { Executor } from '../engine/Executor';
import type { RigSource } from '../engine/stage/RigSource';
import { buildDemoShowFile } from './demo/demoShowFile';
import type { ShowSerializer } from './ShowSerializer';

/** What loading the demo needs: the loader, playback and the bus that triggers the save. */
export interface DemoShowDeps {
  /** The built-in rig; used only without a `source`. */
  readonly rig: Rig;
  /** The current stage, read at each load, so the demo follows a custom stage and keeps it; missing: the built-in. */
  readonly source?: RigSource;
  readonly serializer: ShowSerializer;
  readonly execs: readonly Executor[];
  readonly state: AppState;
  readonly bus: EngineBus;
}

/**
 * The built-in demo: loaded on a first visit, after a broken save, and from the Show File dialog. It goes through the
 * normal loader, so a demo is exactly a show file; then it starts cue 1 at once, selects executor 1 and asks for a
 * save (the demo replaces whatever was stored).
 */
export class DemoShow {
  readonly #deps: DemoShowDeps;

  constructor(deps: DemoShowDeps) {
    this.#deps = deps;
  }

  /** Replaces the show with the demo. The caller repaints afterwards, as after any load. */
  load(): void {
    const { rig, source, serializer, execs, state, bus } = this.#deps;
    serializer.load(source ? buildDemoShowFile(source.rig, source) : buildDemoShowFile(rig));
    execs[0]?.goto(0, 0);
    state.selectExec(0);
    bus.emit('showChanged', undefined);
  }
}
