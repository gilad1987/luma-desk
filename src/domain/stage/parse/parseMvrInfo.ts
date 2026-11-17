import type { FixtureTypeId } from '../../FixtureType';
import { TYPES } from '../../fixtureTypes';
import type { MvrDesignInfo, MvrFixtureInfo, MvrLayer } from '../mvr';
import { parseFootprint } from './parseFootprint';
import { allDefined, describeValue, type Raw, type Reader } from './readers';

function isTypeId(v: unknown): v is FixtureTypeId {
  return typeof v === 'string' && Object.hasOwn(TYPES, v);
}

function parseFixtureInfo(r: Reader, raw: unknown, path: string): MvrFixtureInfo | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const info = {
    uuid: r.str(o.uuid, `${path}.uuid`),
    layer: r.str(o.layer, `${path}.layer`),
    gdtfName: r.str(o.gdtfName, `${path}.gdtfName`),
    gdtfMode: r.str(o.gdtfMode, `${path}.gdtfMode`),
    type: isTypeId(o.type) ? o.type : r.fail(`${path}.type`, `unknown type ${describeValue(o.type)}`),
  };
  const focus = r.optional(o.focus, `${path}.focus`, r.vec3);
  const footprint = r.optional(o.footprint, `${path}.footprint`, (v, p) => parseFootprint(r, v, p));
  if (!allDefined(info)) return undefined;
  return { ...info, ...(focus === undefined ? {} : { focus }), ...(footprint === undefined ? {} : { footprint }) };
}

/**
 * Each fixture entry; keys must be desk ids (positive integers as text), because the rig looks them up by id. A bad
 * key is reported and skipped, so a `__proto__` key from `JSON.parse` never reaches an assignment that would set the
 * object's prototype; `Object.fromEntries` defines own properties only.
 */
function parseFixtureInfos(r: Reader, raw: unknown, path: string): Record<string, MvrFixtureInfo> | undefined {
  const o: Raw | undefined = r.obj(raw, path);
  if (!o) return undefined;
  const entries: [string, MvrFixtureInfo][] = [];
  for (const [key, value] of Object.entries(o)) {
    if (!/^[1-9]\d*$/.test(key)) {
      r.fail(`${path}.${key}`, `expected a fixture id key, got ${describeValue(key)}`);
      continue;
    }
    const info = parseFixtureInfo(r, value, `${path}.${key}`);
    if (info) entries.push([key, info]);
  }
  return Object.fromEntries(entries);
}

function parseLayer(r: Reader, raw: unknown, path: string): MvrLayer | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const layer = { uuid: r.str(o.uuid, `${path}.uuid`), name: r.str(o.name, `${path}.name`) };
  return allDefined(layer) ? layer : undefined;
}

/**
 * Reads a design's stored `mvr` block (contract G4; Amendment 3: the MVR lane owns this reader). Every field is
 * checked, so a hand-edited show cannot hand the rig a fixture entry without a uuid or a non-finite offset.
 */
export function parseMvrInfo(r: Reader, raw: unknown, path: string): MvrDesignInfo | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const info = {
    fixtures: parseFixtureInfos(r, o.fixtures, `${path}.fixtures`),
    layers: r.list(o.layers, `${path}.layers`, (v, p) => parseLayer(r, v, p)),
    hiddenLayers: r.list(o.hiddenLayers, `${path}.hiddenLayers`, r.str),
    offset: r.vec3(o.offset, `${path}.offset`),
  };
  return allDefined(info) ? info : undefined;
}
