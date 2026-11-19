import type { MvrAuxName, MvrDesignFileData, MvrFileColor, MvrFixtureFileData } from '../mvrFileData';
import type { Key } from './fieldReader';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';

function parseColor(r: Reader, parent: Raw, key: Key, at: string): MvrFileColor | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const color = { xyY: r.vec3(o, 'xyY', path), rgb: r.vec3(o, 'rgb', path) };
  return allDefined(color) ? color : undefined;
}

function parseAuxName(r: Reader, parent: Raw, key: Key, at: string): MvrAuxName | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const uuid = r.str(o, 'uuid', path);
  // a dangling reference has no name
  const name = r.optional(o, 'name', path, r.str);
  return uuid === undefined ? undefined : { uuid, ...(name === undefined ? {} : { name }) };
}

/** An index into a table of the design: a whole number from 0. A fraction or a negative number names no entry. */
function parseIndex(r: Reader, o: Raw, key: Key, at: string): number | undefined {
  const value = r.num(o, key, at);
  if (value === undefined || (Number.isInteger(value) && value >= 0)) return value;
  return r.fail(r.path(at, key), `expected a whole number from 0, got ${value}`);
}

/** A flag the import stores only when true; a stored `false` reads as absent, which means the same. */
export function parseFlag(r: Reader, o: Raw, key: Key, at: string): true | undefined {
  return r.optional(o, key, at, r.bool) === true ? true : undefined;
}

/** Only the entries with a value: an absent key keeps old shows and new shows the same shape. */
function given<T extends object>(facts: T): Partial<T> {
  const entries = Object.entries(facts).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as Partial<T>;
}

/** The file data of one fixture entry (`MvrFixtureFileData`); every field is optional, as older shows have none. */
export function parseFixtureFileData(r: Reader, o: Raw, path: string): MvrFixtureFileData {
  const index = (key: string): number | undefined => r.optional(o, key, path, (c, k, p) => parseIndex(r, c, k, p));
  const facts = {
    color: index('color'),
    commands: index('commands'),
    position: index('position'),
    classing: index('classing'),
    fixtureFunction: r.optional(o, 'fixtureFunction', path, r.str),
    dmxInvertPan: parseFlag(r, o, 'dmxInvertPan', path),
    dmxInvertTilt: parseFlag(r, o, 'dmxInvertTilt', path),
    castShadow: r.optional(o, 'castShadow', path, r.bool),
  };
  return given(facts) as MvrFixtureFileData;
}

/** The colour, command, position and class tables of the stored `mvr` block (`MvrDesignFileData`); each optional. */
export function parseDesignFileData(r: Reader, o: Raw, path: string): MvrDesignFileData {
  const tables = {
    colors: r.optional(o, 'colors', path, (c, k, p) => r.list(c, k, p, (i, n, q) => parseColor(r, i, n, q))),
    commandSets: r.optional(o, 'commandSets', path, (c, k, p) => r.list(c, k, p, (i, n, q) => r.list(i, n, q, r.str))),
    positions: r.optional(o, 'positions', path, (c, k, p) => r.list(c, k, p, (i, n, q) => parseAuxName(r, i, n, q))),
    classes: r.optional(o, 'classes', path, (c, k, p) => r.list(c, k, p, (i, n, q) => parseAuxName(r, i, n, q))),
  };
  return given(tables) as MvrDesignFileData;
}
