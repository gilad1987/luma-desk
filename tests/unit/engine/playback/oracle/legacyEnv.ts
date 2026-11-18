// The globals of index.base.html 1529-1536 that the copied functions read, passed in explicitly.
import type { Fixture } from '../../../../../src/domain/Fixture';
import type { LExec, LFx, LInst, LVals } from './legacyTypes';

/** The globals the original functions read, passed in explicitly. */
export interface LegacyEnv {
  fixtures: readonly Fixture[];
  execs: LExec[];
  autoExec: LExec;
  allExecs: LExec[];
  prog: { vals: LVals; fxList: LInst[]; fx: LFx };
  selected: Set<number>; // stands for the `f.sel` mirror that setSel kept
  autoPump: number;
  autoHitUntil: number;
  bpm: number;
  beatOrigin: number;
  gm: number;
  blackout: boolean;
  highlight: boolean;
  now: number; // what nowS() returns
  messages: string[]; // log() and toast() calls, in order
}

/** The original executor literals (1529, 1530). */
export function legacyEnv(fixtures: readonly Fixture[]): LegacyEnv {
  const execs: LExec[] = [...Array<unknown>(10)].map(() => ({
    name: '',
    cues: [],
    cur: -1,
    level: 0,
    on: false,
    lastGo: 0,
    vals: {},
    fx: {},
    fade: null,
    flash: false,
    flashOnly: false,
    cache: {},
  }));
  const autoExec: LExec = {
    name: 'AUTO',
    cues: [],
    cur: -1,
    level: 0,
    on: false,
    lastGo: 0,
    vals: {},
    fx: {},
    fade: null,
    flash: false,
    cache: {},
    auto: true,
  };
  return {
    fixtures,
    execs,
    autoExec,
    allExecs: [...execs, autoExec],
    prog: { vals: {}, fxList: [], fx: {} },
    selected: new Set(),
    autoPump: 1,
    autoHitUntil: 0,
    bpm: 120,
    beatOrigin: 0,
    gm: 1,
    blackout: false,
    highlight: false,
    now: 0,
    messages: [],
  };
}
