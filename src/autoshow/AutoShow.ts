import type { OutputModulation } from '../engine/OutputMerger';
import { defaultAutoSettings, type AutoSettings } from './AutoSettings';
import type { AutoShowDeps } from './AutoShowDeps';
import type { AutoStyle } from './AutoStyle';
import { pumpLevel } from './pumpLevel';
import type { Section } from './sections';
import { LookCycle } from './LookCycle';
import { barsPerLook, beatPosition } from './SongStructure';
import { STYLES, type AutoStyleId } from './styles';

/**
 * Plays generated looks on the auto executor, one per `barsPerLook` bars, following the style's section cycle. It
 * never reaches into the output merge: each frame it exposes `modulation` (beat pump and blinder hit), which the frame
 * loop passes to `OutputMerger.compute`.
 */
export class AutoShow {
  readonly settings: AutoSettings = defaultAutoSettings();
  private running = false;
  private readonly cycle = new LookCycle();
  private currentSection: Section | '' = '';
  private pump = 1;
  private hitUntil = 0;
  private readonly deps: AutoShowDeps;

  constructor(deps: AutoShowDeps) {
    this.deps = deps;
  }

  get on(): boolean {
    return this.running;
  }
  /** The section of the playing look; '' before the first look. */
  get section(): Section | '' {
    return this.currentSection;
  }
  get style(): AutoStyle {
    return STYLES[this.settings.style];
  }
  /** This frame's influence on the output, updated by `tick` even while the auto-show is off. */
  get modulation(): OutputModulation {
    return { pump: this.pump, hitUntil: this.hitUntil };
  }
  barsPerLook(): number {
    return barsPerLook(this.style, this.settings.bars);
  }

  /** Switches style and restarts its section cycle; a running show changes look at once. */
  selectStyle(id: AutoStyleId): void {
    this.settings.style = id;
    this.cycle.restartSections();
    if (this.running) this.newLook();
  }

  /** Starts on the next section's look now and puts the beat grid's bar 0 here. */
  start(): void {
    const { pool, programmer, tempo, clock, bus } = this.deps;
    this.running = true;
    this.cycle.restart();
    if (this.settings.take) pool.execs.forEach((e) => e.off());
    if (programmer.hasContent())
      bus.emit('message', {
        kind: 'toast',
        text: 'Note: programmer values override Auto — press CLEAR twice to release',
      });
    tempo.setBeatOrigin(clock.nowSeconds());
    this.newLook();
    this.cycle.anchorBar(0);
    this.deps.onChange();
  }

  stop(): void {
    this.running = false;
    this.deps.pool.autoExec.off();
    this.deps.onChange();
  }

  /** Generates the next section's look and fades the auto executor to it; big sections may fire a blinder hit. */
  newLook(): void {
    const S = this.style,
      sec = this.cycle.nextSection(S);
    const cue = this.deps.looks.generate(S, sec, this.settings);
    this.currentSection = sec;
    const autoExec = this.deps.pool.autoExec;
    autoExec.cues = [cue];
    autoExec.resetTracking();
    autoExec.level = this.settings.master;
    autoExec.goto(0, S.fade);
    if (this.settings.hits && S.blinders && (sec === 'chorus' || sec === 'drop' || sec === 'hook'))
      this.hitUntil = this.deps.clock.nowSeconds() + 0.28;
  }

  /** Per frame: updates the pump (also while off), follows the master and changes look on the bar. */
  tick(now: number): void {
    const { beats, beat, bar } = beatPosition(now, this.deps.tempo);
    this.pump = pumpLevel(this.settings.pulse, beats - beat, this.deps.bassLevel);
    if (!this.running) return;
    this.deps.pool.autoExec.level = this.settings.master;
    if (this.cycle.isNewLookBar(bar, this.barsPerLook())) this.newLook();
  }
}
