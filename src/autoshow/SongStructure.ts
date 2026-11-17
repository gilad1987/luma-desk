import type { TempoReading } from '../engine/Phaser';
import type { AutoStyle } from './AutoStyle';
import type { Section } from './sections';

/** Where a frame falls in the music: beats as a fraction, the whole beat and the bar of four beats. */
export interface BeatPosition {
  readonly beats: number;
  readonly beat: number;
  readonly bar: number;
}

/** How loud each section plays, as a factor on the operator's energy. `intro` is missing on purpose (quirk E5). */
const SECTION_ENERGY: Readonly<Partial<Record<Section, number>>> = {
  groove: 0.75,
  verse: 0.65,
  chorus: 1,
  hook: 1,
  build: 0.8,
  drop: 1,
};

/** The energy factor of a section; a section without an entry plays at 0.8. */
export function sectionEnergy(section: Section): number {
  return SECTION_ENERGY[section] ?? 0.8;
}

/** The section of look number `index` (counted from the start of the auto-show) in the style's cycle. */
export function sectionAt(style: AutoStyle, index: number): Section {
  const section = style.sections[index % style.sections.length];
  if (section === undefined) throw new RangeError('An auto-show style needs at least one section');
  return section;
}

/** Bars per look: the operator's setting, or the style's own when the setting is 0 ("auto"). */
export function barsPerLook(style: AutoStyle, barsSetting: number): number {
  return barsSetting || style.bars;
}

/** The beat position at time `now` (seconds) on the tempo grid. Before the beat origin it is negative. */
export function beatPosition(now: number, tempo: TempoReading): BeatPosition {
  const beats = ((now - tempo.beatOrigin) * tempo.bpm) / 60,
    beat = Math.floor(beats);
  return { beats, beat, bar: Math.floor(beat / 4) };
}

/**
 * Whether a new look starts on this bar: every `perLook` bars counted from bar 0, before the origin too. The original
 * double modulo is kept as written; for a test against 0 it gives the same result as a single one.
 */
export function isLookChangeBar(bar: number, perLook: number): boolean {
  return ((bar % perLook) + perLook) % perLook === 0;
}
