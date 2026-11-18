import { clamp, jsonClone, type Clock } from '../core';
import { cueAt, type Cue, type FixtureValues } from './CueList';
import type { Fade } from './Fade';
import type { FxIndex } from './shared';
import { tracked, type TrackedState } from './Tracking';

/**
 * One playback: a cue sequence, a fader level and what it currently outputs. Fields stay public and mutable because the
 * show loader, the auto-show and the panels assign them directly.
 */
export class Executor {
  name = '';
  cues: Cue[] = [];
  /** Index of the current cue, -1 when off. */
  cur = -1;
  level = 0;
  on = false;
  /** Executor-clock seconds of the last GO or flash; later wins for every attribute except the dimmer. */
  lastGo = 0;
  /** The values this executor outputs now (the fade's blend while one runs). */
  vals: FixtureValues = {};
  fx: FxIndex = {};
  fade: Fade | null = null;
  flash = false;
  /** Set when a flash started the executor, so releasing the flash also turns it off. */
  flashOnly = false;
  /** Tracked state per cue index; see {@link tracked}. */
  cache: Record<number, TrackedState> = {};
  /** True for the auto-show executor, whose level the auto-show pump modulates on beams and spots. */
  readonly auto: boolean;
  /** Called at the end of every `goto` with the cue it started; `ExecutorPool.observeCues` sets it. */
  onCue?: (cue: Cue) => void;
  readonly #clock: Clock;

  constructor(auto: boolean, clock: Clock) {
    this.auto = auto;
    this.#clock = clock;
  }

  /** Starts a fade to cue `i` (clamped into range) over `fadeOverride` seconds, or the cue's own fade, or 2. */
  goto(i: number, fadeOverride?: number): void {
    if (!this.cues.length) return;
    i = clamp(i, 0, this.cues.length - 1);
    const tr = tracked(this, i);
    const dur = fadeOverride ?? cueAt(this.cues, i).fade ?? 2;
    this.fade = { from: jsonClone(this.vals), to: tr.vals, t0: this.#clock.nowSeconds(), dur, paused: false };
    this.fx = tr.fx;
    this.cur = i;
    this.on = true;
    this.lastGo = this.#clock.nowSeconds();
    this.onCue?.(cueAt(this.cues, i));
  }

  off(): void {
    this.on = false;
    this.cur = -1;
    this.vals = {};
    this.fx = {};
    this.fade = null;
  }

  /** Freezes a running fade; GO resumes it from the same point. */
  pause(): void {
    if (this.fade && !this.fade.paused) {
      this.fade.paused = true;
      this.fade.pausedAt = this.#clock.nowSeconds() - this.fade.t0;
    }
  }

  /** Continues a paused fade. Returns false, and does nothing, when no fade is paused. */
  resume(): boolean {
    const F = this.fade;
    if (!F?.paused) return false;
    F.paused = false;
    // pause() always sets pausedAt; NaN is what the untyped arithmetic gave for a missing value
    F.t0 = this.#clock.nowSeconds() - (F.pausedAt ?? NaN);
    return true;
  }

  /** Drops the tracking cache after a cue edit and, if playing, jumps to the edited cue's new state without a fade. */
  invalidate(): void {
    this.cache = {};
    if (this.on && this.cur >= 0) {
      const tr = tracked(this, this.cur);
      this.vals = jsonClone(tr.vals);
      this.fx = tr.fx;
      this.fade = null;
    }
  }

  /** Drops the tracking cache only, for a cue list replaced wholesale; what plays now is left as it is. */
  resetTracking(): void {
    this.cache = {};
  }
}
