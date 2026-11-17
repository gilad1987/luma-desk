import { byId } from '../../dom';
import type { UiPanel } from '../UiPanel';
import { CueHud } from './CueHud';
import { cueHudMarkup } from './cueHudMarkup';
import { ExecutorCard } from './ExecutorCard';
import type { ExecutorsDeps, ExecutorsHosts } from './ExecutorsDeps';
import { MasterSection } from './MasterSection';
import { masterMarkup } from './masterMarkup';

/** Executors shown as cards; the pool has exactly this many playback executors. */
const CARD_COUNT = 10;

/**
 * The playback side: the executor strip (`#execs`), the master section and the cue HUD. Cards are built once at
 * boot; everything repaints on the 50 ms tick from engine state.
 */
export class ExecutorsPanel implements UiPanel {
  readonly #deps: ExecutorsDeps;
  readonly #cards: ExecutorCard[];
  readonly #hud: CueHud;
  readonly #master: MasterSection;

  /** Renders the HUD and the strip with the master section, wires the master keys and builds the cards. */
  constructor(hosts: ExecutorsHosts, deps: ExecutorsDeps) {
    this.#deps = deps;
    hosts.viewerTip.insertAdjacentHTML('afterend', cueHudMarkup);
    hosts.desk.insertAdjacentHTML('beforeend', masterMarkup);
    this.#hud = new CueHud(deps);
    this.#master = new MasterSection(deps);
    const strip = byId('execs');
    this.#cards = deps.pool.execs.slice(0, CARD_COUNT).map((e, i) => new ExecutorCard(e, i, deps));
    for (const card of this.#cards) strip.appendChild(card.element);
  }

  /** The old `updateExecUI` plus the master repaint of the fast tick; PAUSE is not updated while Auto runs (Q23). */
  fast(): void {
    const { state, pool, autoShow } = this.#deps;
    const i = state.selExec;
    for (const card of this.#cards) card.paint(i);
    const e = pool.execs[i];
    if (e) {
      this.#master.paintSelected(e, i);
      this.#hud.paint(e, i);
      if (!autoShow.on) this.#master.paintPause(e);
    }
    this.#master.paintLevels();
  }
}
