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

/** One fixture of the current rig and its DMX patch (null when unpatched), so a round trip can compare both. */
export interface StageFixturePatch {
  id: number;
  /** The app's `DmxPatch` shape, written out: the suite reads the app only through this API, never from src. */
  patch: { universe: number; address: number; mode: string } | null;
}

/**
 * The stage the rig is built from. MVR specs read it instead of the 3D view, because the scene is drawn only on
 * request in test mode and its meshes say nothing about ids or patch.
 */
export interface MvrStageInfo {
  kind: 'template' | 'builder' | 'mvr';
  /** The `.mvr` file name an MVR stage came from; absent for templates and builder stages. */
  fileName?: string;
  fixtureCount: number;
  /** In rig order. */
  patches: StageFixturePatch[];
}

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
  /** Named for MVR, as Stage Builder's hook has `__desk.stage()` with another shape. */
  mvrStage(): MvrStageInfo;
  /**
   * Resolves after the latest MVR load ended, with success or failure: a picked file, or the restore from IndexedDB
   * at boot. Both run off the frame loop, so a spec cannot see the end in frames or the DOM. The app queues the load
   * in the input's change handler before its first await, so a spec that picks a file and then calls this waits for
   * that file, not an older load. Resolved at once when no load ran.
   */
  mvrReady(): Promise<void>;
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
