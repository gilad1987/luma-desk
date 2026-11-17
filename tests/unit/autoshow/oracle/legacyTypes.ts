import type { Fixture } from '../../../../src/domain/Fixture';
import type { legacyGroups } from './legacyGenLook';

// Types for the reference oracle of the original auto-show (index.html 2555-2615). The original was untyped; these
// describe the shapes it used, as loosely as it used them.

export type LegacyVals = Record<string, number | undefined>;
export type LegacyFn = (f: Fixture, k: number, n: number) => LegacyVals;
export type LegacySet = (ids: readonly number[], o: LegacyVals | LegacyFn) => void;
export type LegacyGroups = ReturnType<typeof legacyGroups>;

export interface LegacyStyle {
  name: string;
  he: string;
  fade: number;
  bars: number;
  pal: [string, string][];
  pos: string[];
  fxPos: string[];
  fxDim: string[];
  fxCol?: string[];
  rate?: number[];
  gobos?: number[];
  strobe: boolean;
  blinders: boolean;
  mono?: boolean;
  calm?: boolean;
  orch?: boolean;
  screen: number[];
  sections: string[];
}

export interface LegacyFx {
  type: string;
  rate: number;
  size: number;
  spread: number;
  ids: number[];
}

export interface LegacyColor {
  r: number;
  g: number;
  b: number;
}

/** The locals of the original genLook that its later lines read. */
export interface LegacyLocals {
  vals: Record<string, LegacyVals>;
  fx: LegacyFx[];
  set: LegacySet;
  L: (x: number) => number;
  n1: string;
  c1: LegacyColor;
  c2: LegacyColor;
  big: boolean;
}

export interface LegacyCue {
  num: number;
  name: string;
  fade: number;
  vals: Record<string, LegacyVals>;
  fx: LegacyFx[];
  sec: string;
}

/** The globals the original genLook read: the fixtures, FX by id, the AG groups and three `auto` fields. */
export interface LegacyEnv {
  fixtures: readonly Fixture[];
  FX: ReadonlyMap<number, Fixture>;
  AG: LegacyGroups;
  auto: { energy: number; strobes: boolean; screen: boolean };
}
