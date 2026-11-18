import type { FixtureTypeId } from '../../FixtureType';
import { TYPES } from '../../fixtureTypes';
import type { MvrDesignInfo, MvrFixtureInfo, MvrLayer } from '../mvr';
import type { Key } from './fieldReader';
import { parseFootprint } from './parseFootprint';
import { allDefined, describeValue, type Raw } from './rawValues';
import type { Reader } from './readers';

function isTypeId(v: unknown): v is FixtureTypeId {
  return typeof v === 'string' && Object.hasOwn(TYPES, v);
}

function parseFixtureInfo(r: Reader, parent: Raw, key: Key, at: string): MvrFixtureInfo | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const type = o['type'];
  const info = {
    uuid: r.str(o, 'uuid', path),
    layer: r.str(o, 'layer', path),
    gdtfName: r.str(o, 'gdtfName', path),
    gdtfMode: r.str(o, 'gdtfMode', path),
    type: isTypeId(type) ? type : r.fail(r.path(path, 'type'), `unknown type ${describeValue(type)}`),
  };
  const focus = r.optional(o, 'focus', path, r.vec3);
  const footprint = r.optional(o, 'footprint', path, (c, k, p) => parseFootprint(r, c, k, p));
  if (!allDefined(info)) return undefined;
  return { ...info, ...(focus === undefined ? {} : { focus }), ...(footprint === undefined ? {} : { footprint }) };
}

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
  return allDefined(layer) ? layer : undefined;
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
  return allDefined(info) ? info : undefined;
}
