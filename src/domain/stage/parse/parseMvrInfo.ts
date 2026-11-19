import type { MvrDesignInfo, MvrFixtureInfo, MvrLayer } from '../mvr';
import type { StageBounds } from '../types';
import type { Key } from './fieldReader';
import { parseDesignFileData } from './parseMvrFileData';
import { parseFixtureInfo } from './parseMvrFixtureInfo';
import { allDefined, describeValue, type Raw } from './rawValues';
import type { Reader } from './readers';

/**
 * Each fixture entry; keys must be desk ids (positive integers as text), because the rig looks them up by id. A bad
 * key is reported and skipped, so a `__proto__` key from `JSON.parse` never reaches an assignment that would set the
 * object's prototype; `Object.fromEntries` defines own properties only.
 */
function parseFixtureInfos(r: Reader, parent: Raw, at: string): Record<string, MvrFixtureInfo> | undefined {
  const o = r.obj(parent, 'fixtures', at);
  if (!o) return undefined;
  const path = r.path(at, 'fixtures');
  const entries: [string, MvrFixtureInfo][] = [];
  for (const key of Object.keys(o)) {
    if (!/^[1-9]\d*$/.test(key)) {
      r.fail(r.path(path, key), `expected a fixture id key, got ${describeValue(key)}`);
      continue;
    }
    const info = parseFixtureInfo(r, o, key, path);
    if (info) entries.push([key, info]);
  }
  return Object.fromEntries(entries);
}

function parseLayer(r: Reader, parent: Raw, key: Key, at: string): MvrLayer | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const layer = { uuid: r.str(o, 'uuid', path), name: r.str(o, 'name', path) };
  // a show saved before layer keys has no `fileUuid`, and parses as before
  const fileUuid = r.optional(o, 'fileUuid', path, r.str);
  if (!allDefined(layer)) return undefined;
  return fileUuid === undefined ? layer : { ...layer, fileUuid };
}

/**
 * Reads a design's stored `mvr` block (contract G4; Amendment 3: the MVR lane owns this reader). Every field is
 * checked, so a hand-edited show cannot hand the rig a fixture entry without a uuid or a non-finite offset.
 */
export function parseMvrInfo(r: Reader, parent: Raw, key: Key, at: string): MvrDesignInfo | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const info = {
    fixtures: parseFixtureInfos(r, o, path),
    layers: r.list(o, 'layers', path, (c, k, p) => parseLayer(r, c, k, p)),
    hiddenLayers: r.list(o, 'hiddenLayers', path, r.str),
    offset: r.vec3(o, 'offset', path),
  };
  const ledLayers = r.optional(o, 'ledLayers', path, (c, k, p) => r.list(c, k, p, r.str));
  const imported = r.optional(o, 'imported', path, (c, k, p) => r.list(c, k, p, r.str));
  const seatArea = r.optional(o, 'seatArea', path, (c, k, p) => parseBox(r, c, k, p));
  const fileData = parseDesignFileData(r, o, path);
  if (!allDefined(info)) return undefined;
  return {
    ...info,
    ...(ledLayers === undefined ? {} : { ledLayers }),
    ...(imported === undefined ? {} : { imported }),
    ...(seatArea === undefined ? {} : { seatArea }),
    ...fileData,
  };
}

/** A box of two finite points (`seatArea`); a show saved before the field existed has none and reads unchanged. */
function parseBox(r: Reader, parent: Raw, key: Key, at: string): StageBounds | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const box = { min: r.vec3(o, 'min', r.path(at, key)), max: r.vec3(o, 'max', r.path(at, key)) };
  return allDefined(box) ? box : undefined;
}
