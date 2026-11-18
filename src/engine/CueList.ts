import type { AttrValues } from '../domain/attributes';
import type { PhaserInstance } from './shared';

/**
 * Attribute values per fixture id: what a cue stores, what an executor plays and what a fade blends. The key type is
 * `string` because that is what these records hold at run time (JSON keys, `Object.keys`); a numeric id still indexes.
 */
export type FixtureValues = Record<string, AttrValues>;

/**
 * One step of an executor's sequence. Cues track: each holds only what changes, and playing cue `i` applies cues 0..i.
 * Fields are mutable because the sequence editor and the command line edit cues in place; the key order
 * (num, name, fade, vals, fx) is the order show files are saved in.
 */
export interface Cue {
  /** Sort key and the number the operator types; may be fractional (2.5 sits between 2 and 3). */
  num: number;
  name: string;
  /** Fade-in time in seconds. */
  fade: number;
  vals: FixtureValues;
  fx: PhaserInstance[];
  /** Song-section label written by the auto-show; manual cues have none. */
  sec?: string;
}

/**
 * The number a new cue gets when the operator gives none: the next whole number after the last cue, or 1. One helper
 * for the two copies of the original (quirk B7, orig:1850, 2714).
 */
export function nextCueNumber(cues: readonly Cue[]): number {
  const last = cues.at(-1);
  return last ? Math.floor(last.num) + 1 : 1;
}

/** The index of the first cue numbered `num`, or -1. */
export function findCueIndex(cues: readonly Cue[], num: number): number {
  return cues.findIndex((c) => c.num === num);
}

/** Adds `cue` and keeps the list ordered by number; equal numbers keep their insertion order. */
export function insertCueSorted(cues: Cue[], cue: Cue): void {
  cues.push(cue);
  cues.sort((a, b) => a.num - b.num);
}

/**
 * The cue at index `i`. Callers pass an index they have already brought into range, so a miss is a programming error
 * and throws instead of returning undefined.
 */
export function cueAt(cues: readonly Cue[], i: number): Cue {
  const cue = cues[i];
  if (cue === undefined) throw new RangeError(`No cue at index ${i} (list has ${cues.length})`); // quirk J2 (orig:1628)
  return cue;
}
