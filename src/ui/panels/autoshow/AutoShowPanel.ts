import { beatPosition } from '../../../autoshow/SongStructure';
import { STYLE_IDS, STYLES } from '../../../autoshow/styles';
import { he } from '../../../i18n/he';
import { byId } from '../../dom';
import { createElement } from '../../shared';
import type { UiPanel } from '../UiPanel';
import { autoShowMarkup } from './autoShowMarkup';
import type { AutoShowDeps } from './AutoShowDeps';
import { IDLE_STATUS, lookCountdown, runningStatus, styleCardHtml } from './autoShowText';
import { wireAutoSettings } from './wireAutoSettings';
import { wireLookButtons } from './wireLookButtons';
import { wireSong } from './wireSong';

/**
 * The Auto Show pane. The style grid and the START button repaint on a style click and when Auto starts or stops
 * (pass `renderStyles` as the auto-show's `onChange`); the beat dots, BPM, section line and status follow the fast
 * tick, the last two only while the pane shows.
 */
export class AutoShowPanel implements UiPanel {
  readonly #deps: AutoShowDeps;
  readonly #grid: HTMLElement;
  readonly #go: HTMLElement;
  readonly #bpm: HTMLElement;
  readonly #section: HTMLElement;
  readonly #status: HTMLElement;
  readonly #play: HTMLElement;
  readonly #dots: readonly Element[];

  /**
   * Renders the pane at the end of `host` (`#side`) and wires its controls. Construct it after `PoolsPanel` and before
   * `SequencePanel`: the panes append in construction order and the original order is pools, auto, seq, sheet.
   */
  constructor(host: HTMLElement, deps: AutoShowDeps) {
    this.#deps = deps;
    host.insertAdjacentHTML('beforeend', autoShowMarkup);
    this.#grid = byId('styleGrid');
    this.#go = byId('autoGo');
    this.#bpm = byId('autoBpm');
    this.#section = byId('autoSec');
    this.#status = byId('autoStatus');
    this.#play = byId('songPlay');
    this.#dots = Array.from(byId('beatDots').querySelectorAll('i'));
    this.#go.onclick = () => {
      if (deps.auto.on) deps.auto.stop();
      else deps.auto.start();
    };
    wireAutoSettings(deps.auto);
    wireSong(deps);
    wireLookButtons(deps);
  }

  /** Rebuilds the style grid (the original `renderAuto`) and sets the START/STOP button. */
  renderStyles(): void {
    const { auto } = this.#deps;
    this.#grid.innerHTML = '';
    for (const id of STYLE_IDS) {
      const html = styleCardHtml(STYLES[id], he.autoStyleTaglines[id]);
      const card = createElement('div', 'style' + (auto.settings.style === id ? ' on' : ''), html);
      card.onclick = () => {
        auto.selectStyle(id);
        this.renderStyles();
      };
      this.#grid.appendChild(card);
    }
    this.#go.classList.toggle('on', auto.on);
    this.#go.textContent = auto.on ? '■ STOP AUTO' : '▶ START AUTO';
  }

  /**
   * Runs on the fast tick because the beat dots must follow the beat. The countdown and status lines are written only
   * while the Auto pane shows, as the old code did.
   */
  fast(now: number): void {
    const { auto, tempo, sideTab } = this.#deps;
    const { beat, bar } = beatPosition(now, tempo),
      inBar = ((beat % 4) + 4) % 4,
      perLook = auto.barsPerLook();
    this.#dots.forEach((dot, i) => dot.classList.toggle('on', i === inBar));
    this.#bpm.textContent = `${tempo.bpm} BPM`;
    if (sideTab() !== 'auto') return;
    const left = perLook - (((bar % perLook) + perLook) % perLook);
    this.#section.textContent = auto.on ? lookCountdown(auto.section, left) : '';
    this.#status.innerHTML = auto.on ? runningStatus(auto.style, auto.section, perLook) : IDLE_STATUS;
  }

  /** Resets the play button when the song plays to its end; pass it as the `SongPlayer`'s `onEnded`. */
  songEnded(): void {
    this.#play.textContent = '▶ Play';
  }
}
