import type { MvrStageInfo } from './mvrStageInfo';
import type { ViewFitInfo } from './viewFitInfo';
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
  /** Named for MVR, as Stage Builder's hook has `__desk.stage()` with another shape. */
  mvrStage(): MvrStageInfo;
  /**
   * Resolves after the latest MVR load ended, with success or failure: a picked file, or the boot restore from
   * IndexedDB (both run off the frame loop). The app queues the load in the change handler before its first await,
   * so a spec that picks a file and then calls this waits for that file. Resolved at once when no load ran.
   */
  mvrReady(): Promise<void>;
  /** The projected rig box of an imported stage (null without one) and the free part of the 3D view, CSS pixels. */
  viewFit(): ViewFitInfo;
  /** True while the MVR scenery shows the layers of a file; the 3D view itself says nothing a spec can read. */
  mvrScenery(): boolean;
  /** True once the lazy MVR post chain draws the frames of an MVR stage. */
  mvrPostChain(): boolean;
  /** Each drawn fixture body: the import's plan, the GDTF box (X, Y, Z) and the measured width, depth, height. */
  mvrBodies(): Promise<
    readonly { id: number; product: string; draw: string; box: readonly number[] | null; size: readonly number[] }[]
  >;
}

declare global {
  interface Window {
    __desk: {
      /** Present only with ?test in the URL; waitForTestApi() narrows it once for every spec. */
      test?: DeskTestApi;
      setView(view: string, instant?: boolean): void;
      /** The current rig's fixtures, read at each access. */
      fixtures: { id: number; out: AttrValues }[];
      /** The fixture count and the design's source and venue kinds. */
      stage(): { count: number; source: string; venue: string };
      /** Applies a template id (`empty`, `theatre`, `festival`, `sultans-pool`) or `built-in` as the builder would. */
      applyTemplate(id: string): void;
      /** The renderer's live GPU geometry and texture counts; equal counts after a repeated apply mean no leak. */
      renderMemory(): { geometries: number; textures: number };
    };
  }
}
