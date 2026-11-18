import type { Cue } from '../CueList';
import type { EngineBus } from '../events';
import type { RigSource } from './RigSource';

/** Every fixture id a cue names, in its values and in its effects, without repeats. */
function cueIds(cue: Readonly<Cue>): Set<number> {
  const ids = new Set(Object.keys(cue.vals).map(Number));
  for (const fx of cue.fx) for (const id of fx.ids) ids.add(id);
  return ids;
}

/**
 * Warns once when a cue names fixtures the current rig does not have (contract §2: keep the data, skip the fixtures).
 * The output merge already skips them, so the cue still plays and works again on a rig that has them. The warning
 * repeats once per committed rig; a preview does not count, as the operator has not chosen that stage yet.
 *
 * Listens to `rigChanged` (to reset) and emits a `message` log. Gets the `EngineBus` and the `RigSource` (the
 * StageService) from main.ts, and the executors call `check`. It subscribes when it is constructed, so its place in
 * the synchronous delivery order is its construction order in main.ts (plan §3.2): after PresetLibrary, before
 * AutoShow.
 */
export class MissingFixtureNotice {
  readonly #bus: EngineBus;
  readonly #source: RigSource;
  readonly #warned = new Set<string>();

  constructor(bus: EngineBus, source: RigSource) {
    this.#bus = bus;
    this.#source = source;
    bus.on('rigChanged', () => {
      if (source.cause !== 'preview') this.#warned.clear();
    });
  }

  /** Called on go/goto; `execIndex` is 0-based and shown 1-based, as the executor log line shows it. */
  check(execIndex: number, cue: Readonly<Cue>): void {
    const key = `${execIndex}:${cue.num}`;
    if (this.#warned.has(key)) return;
    const rig = this.#source.rig;
    const missing = [...cueIds(cue)].filter((id) => rig.get(id) === undefined).length;
    if (missing === 0) return;
    this.#warned.add(key);
    const count = missing === 1 ? '1 fixture is' : `${missing} fixtures are`;
    const text = `Exec ${execIndex + 1} Cue ${cue.num}: ${count} not on this stage (skipped)`;
    this.#bus.emit('message', { kind: 'log', text, level: 'er' });
  }
}
