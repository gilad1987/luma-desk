import type { OutputModulation } from '../engine/OutputMerger';
import { defaultAutoSettings, type AutoSettings } from './AutoSettings';
import type { AutoShowDeps } from './AutoShowDeps';
import type { AutoStyle } from './AutoStyle';
import { pumpLevel } from './pumpLevel';
import { isBigSection, type Section } from './sections';
import { LookCycle } from './LookCycle';
import { barsPerLook, beatPosition } from './SongStructure';
import { STYLES, type AutoStyleId } from './styles';

const PROGRAMMER_OVERRIDES_NOTE = 'Note: programmer values override Auto — press CLEAR twice to release';

/**
 * Plays generated looks on the auto executor, one per `barsPerLook` bars, in the style's section cycle. It never
 * touches the output merge: the frame loop passes its `modulation` (beat pump, blinder hit) to `OutputMerger.compute`.
 */
export class AutoShow {
  /** The operator's choices (style, bars, pulse, master...); the panel edits them in place, the next look reads them. */
  readonly settings: AutoSettings = defaultAutoSettings();
  #running = false;
  readonly #cycle = new LookCycle();
  #currentSection: Section | '' = '';
  readonly #modulation: { pump: number; hitUntil: number } = { pump: 1, hitUntil: 0 };
  readonly #deps: AutoShowDeps;

  constructor(deps: AutoShowDeps) {
    this.#deps = deps;
  }

  /** Whether the auto-show is running; while off, `tick` still updates the pump. */
  get on(): boolean {
    return this.#running;
  }
  /** The section of the playing look; '' before the first look. */
  get section(): Section | '' {
    return this.#currentSection;
  }
  /** The selected style's definition, looked up on each read so a style change applies at once. */
  get style(): AutoStyle {
    return STYLES[this.settings.style];
  }
  /** This frame's pump and blinder hit, updated in place by `tick` even while off: one object, never a snapshot. */
  get modulation(): Readonly<OutputModulation> {
    return this.#modulation;
  }
  /** How many bars each look lasts: the operator's bar setting, or the style's own when it is 0 (auto). */
  barsPerLook(): number {
    return barsPerLook(this.style, this.settings.bars);
  }

  /** Switches style and restarts its section cycle; a running show changes look at once. */
  selectStyle(id: AutoStyleId): void {
    this.settings.style = id;
    this.#cycle.restartSections();
    if (this.#running) this.newLook();
  }

  /** Starts on the next section's look now and puts the beat grid's bar 0 here. */
  start(): void {
    const { pool, programmer, tempo, clock, bus } = this.#deps;
    this.#running = true;
    this.#cycle.restart();
    if (this.settings.take) pool.execs.forEach((e) => e.off());
    if (programmer.hasContent()) bus.emit('message', { kind: 'toast', text: PROGRAMMER_OVERRIDES_NOTE });
    tempo.setBeatOrigin(clock.nowSeconds());
    this.newLook();
    this.#cycle.anchorBar(0);
    this.#deps.onChange();
  }

  /** Stops and releases the auto executor; the pump keeps following the beat. */
  stop(): void {
    this.#running = false;
    this.#deps.pool.autoExec.off();
    this.#deps.onChange();
  }

  /** Generates the next section's look and fades the auto executor to it; big sections may fire a blinder hit. */
  newLook(): void {
    const { looks, pool, clock } = this.#deps;
    const S = this.style,
      sec = this.#cycle.nextSection(S);
    this.#currentSection = sec;
    const autoExec = pool.autoExec;
    autoExec.cues = [looks.generate(S, sec, this.settings)];
    autoExec.resetTracking();
    autoExec.level = this.settings.master;
    autoExec.goto(0, S.fade);
    if (this.settings.hits && S.blinders && isBigSection(sec)) this.#modulation.hitUntil = clock.nowSeconds() + 0.28;
  }

  /** Per frame: updates the pump (also while off), follows the master and changes look on the bar. */
  tick(now: number): void {
    const { beats, beat, bar } = beatPosition(now, this.#deps.tempo);
    this.#modulation.pump = pumpLevel(this.settings.pulse, beats - beat, this.#deps.bassLevel);
    if (!this.#running) return;
    this.#deps.pool.autoExec.level = this.settings.master;
    if (this.#cycle.isNewLookBar(bar, this.barsPerLook())) this.newLook();
  }
}
