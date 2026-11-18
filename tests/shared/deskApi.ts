import type { AttrValues, SavedShow } from './savedShow';

/** The three console layouts; the layout select and lumadesk-layout2 use these names. */
export type Layout = 'ma' | 'desk' | 'classic';

/** One executor; cues are [number, name, fade] so that a failing diff shows each cue on one line. */
export interface ExecState {
  name: string;
  cur: number;
  on: boolean;
  level: number;
  cues: [number, string, number][];
}

/**
 * The parts of the app state a command can change. Groups and presets come from serialize(), so a command that
 * edits them shows up in the transcript diff, not only in the next save.
 */
export interface DeskState {
  sel: number[];
  prog: Record<string, AttrValues>;
  progFx: unknown[];
  selExec: number;
  highlight: boolean;
  blackout: boolean;
  deskMode: Layout;
  execs: ExecState[];
  groups: SavedShow['groups'];
  presets: SavedShow['presets'];
}

/** What one command line did: the log lines as [css class, text], the toast it showed (null if none), the state after. */
export interface CommandResult {
  line: string;
  log: [cls: string, text: string][];
  toast: string | null;
  state: DeskState;
}

/** computeOutput() of one fixture; the id travels with the values so a diff names the fixture. */
export type FixtureOutput = { id: number } & AttrValues;

/**
 * window.__desk.test, the only door the suite uses into the app. Specs never reach into app internals, so the same
 * specs keep passing while later phases move the code.
 */
export interface DeskTestApi {
  now(): number;
  advance(ms: number): number;
  frames(n?: number): Promise<void>;
  randomCalls(): number;
  state(): DeskState;
  serialize(): SavedShow;
  outputAt(sec: number): FixtureOutput[];
  run(line: string): CommandResult;
  applyFx(type: string): void;
}

declare global {
  interface Window {
    __desk: {
      /** Present only with ?test in the URL; waitForTestApi() narrows it once for every spec. */
      test?: DeskTestApi;
      setView(view: string, instant?: boolean): void;
      fixtures: { id: number; out: AttrValues }[];
    };
  }
}
