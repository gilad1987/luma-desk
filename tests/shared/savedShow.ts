/** Values of one fixture, keyed by attribute (dim, r, g, b, pan, ...); the app stores them in this flat form. */
export type AttrValues = Record<string, number>;

/** One stored cue as the show file holds it; vals and fx are kept whole so a round trip can be compared exactly. */
export interface SavedCue {
  num: number;
  name: string;
  fade: number;
  vals: Record<string, AttrValues>;
  fx: unknown[];
}

/** One group slot; slots are object keys, so a missing key means an empty slot. */
export interface SavedGroup {
  name: string;
  ids: number[];
}

/**
 * Show format v1 as serialize() writes it to localStorage. Shows saved by older builds must keep loading, so this
 * shape is a contract the refactor may not change.
 */
export interface SavedShow {
  v: 1;
  groups: Record<string, SavedGroup>;
  presets: Record<string, Record<string, unknown>>;
  execs: { name: string; level: number; cues: SavedCue[] }[];
  bpm: number;
  haze: number;
}
