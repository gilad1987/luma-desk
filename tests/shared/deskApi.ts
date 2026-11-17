/*
 * Types for window.__desk, the only door the suite uses into the app. Specs never reach into app internals, so the
 * same specs keep passing while later phases move the code. window.__desk.test exists only with ?test in the URL.
 */
export type Layout = 'ma' | 'desk' | 'classic';
export type AttrValues = Record<string, number>;

/** One executor; cues are [number, name, fade] so that a failing diff shows each cue on one line. */
export interface ExecState {
  name: string;
  cur: number;
  on: boolean;
  level: number;
  cues: [number, string, number][];
}

export interface DeskState {
  sel: number[];
  prog: Record<string, AttrValues>;
  progFx: unknown[];
  selExec: number;
  highlight: boolean;
  blackout: boolean;
  deskMode: Layout;
  execs: ExecState[];
}

export interface SavedCue {
  num: number;
  name: string;
  fade: number;
  vals: Record<string, AttrValues>;
  fx: unknown[];
}

/** Show format v1 as serialize() writes it; old saved shows in localStorage must keep loading. */
export interface SavedShow {
  v: 1;
  groups: Record<string, { name: string; ids: number[] }>;
  presets: Record<string, Record<string, unknown>>;
  execs: { name: string; level: number; cues: SavedCue[] }[];
  bpm: number;
  haze: number;
}

export interface CommandResult {
  line: string;
  log: [cls: string, text: string][];
  state: DeskState;
}

export type FixtureOutput = { id: number } & AttrValues;

interface DeskTestApi {
  now(): number;
  advance(ms: number): number;
  frames(n?: number): Promise<void>;
  state(): DeskState;
  serialize(): SavedShow;
  outputAt(sec: number): FixtureOutput[];
  run(line: string): CommandResult;
}

declare global {
  interface Window {
    __desk: {
      test: DeskTestApi;
      setView(view: string, instant?: boolean): void;
      fixtures: { id: number; out: AttrValues }[];
    };
  }
}
