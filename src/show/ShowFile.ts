import type { StageDesign } from '../domain/stage/StageDesign';
import type { Cue } from '../engine/CueList';
import type { GroupPool } from '../engine/GroupLibrary';
import type { Preset } from '../engine/presetTypes';

/**
 * A preset as the show file holds it: computed (`fn`) presets are rebuilt from the defaults, so they are never saved.
 */
export type SavedPreset = Exclude<Preset, { kind: 'fn' }>;

/** One executor as the show file holds it, in saved key order. Playback state is not saved. */
export interface SavedExec {
  name: string;
  cues: Cue[];
  level: number;
}

/**
 * Show file format v1, exactly as every version of the desk wrote it; key order is part of the format. Preset pools
 * and slots are string keys because that is what the JSON holds. `v` is written but never read.
 */
export interface ShowFileV1 {
  v: 1;
  groups: GroupPool;
  presets: Record<string, Record<string, SavedPreset>>;
  execs: SavedExec[];
  bpm: number;
  haze: number;
  /** The custom stage design, written last and only when it is not the built-in one (plan §3.4). */
  stage?: StageDesign;
}

/** One executor as the loader reads it: every field may be missing, and the loader fills the default. */
export type SavedExecInput = { [K in keyof SavedExec]?: SavedExec[K] | undefined };

/**
 * What the loader reads after narrowing: a v1 file from any desk version, or a partial show (a new empty show passes
 * groups only). Every field may be missing; the loader fills defaults field by field.
 */
export interface ShowFileInput {
  groups?: GroupPool | undefined;
  presets?: Record<string, Record<string, Preset>> | undefined;
  execs?: SavedExecInput[] | undefined;
  bpm?: number | undefined;
  haze?: number | undefined;
}
