import type { FixtureTypeId } from '../../FixtureType';
import { TYPES } from '../../fixtureTypes';
import type { MvrFixtureInfo } from '../mvr';
import type { Key } from './fieldReader';
import { parseOptics } from './optics/parseOptics';
import { parseFootprint } from './parseFootprint';
import { parseFixtureFileData, parseFlag } from './parseMvrFileData';
import { allDefined, describeValue, type Raw } from './rawValues';
import type { Reader } from './readers';

function isTypeId(v: unknown): v is FixtureTypeId {
  return typeof v === 'string' && Object.hasOwn(TYPES, v);
}

/** The stand-in marker; any other value is an error, so a hand-edited show cannot invent a third kind. */
function parseStandIn(r: Reader, o: Raw, key: Key, at: string): MvrFixtureInfo['standIn'] {
  const value = o[key];
  if (value === 'placeholder' || value === 'device') return value;
  return r.fail(r.path(at, key), `expected placeholder or device, got ${describeValue(value)}`);
}

/** The optional facts of a fixture entry that older shows do not have; each is left out when absent. */
function parseExtras(r: Reader, o: Raw, path: string): Partial<MvrFixtureInfo> {
  const standIn = r.optional(o, 'standIn', path, (c, k, p) => parseStandIn(r, c, k, p));
  const ids = (['customId', 'customIdType', 'fixtureTypeId'] as const).flatMap((key) => {
    const value = r.optional(o, key, path, r.positiveInt);
    return value === undefined ? [] : [[key, value] as const];
  });
  const mixesColour = parseFlag(r, o, 'mixesColour', path);
  return {
    ...(standIn === undefined ? {} : { standIn }),
    ...(mixesColour ? { mixesColour } : {}),
    ...Object.fromEntries(ids),
    ...parseFixtureFileData(r, o, path),
  };
}

/** One fixture entry of the stored `mvr` block; undefined, with the errors reported, when a required field is bad. */
export function parseFixtureInfo(r: Reader, parent: Raw, key: Key, at: string): MvrFixtureInfo | undefined {
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
  const bodySize = r.optional(o, 'bodySize', path, r.positive);
  const optics = r.optional(o, 'optics', path, (c, k, p) => parseOptics(r, c, k, p));
  // A count of earlier elements, absent for 0: a fraction would make a key no `<Fixture>` element has.
  const occurrence = r.optional(o, 'occurrence', path, r.positiveInt);
  if (!allDefined(info)) return undefined;
  const optional = {
    ...(footprint === undefined ? {} : { footprint }),
    ...(bodySize === undefined ? {} : { bodySize }),
    ...(optics === undefined ? {} : { optics }),
    ...(occurrence === undefined ? {} : { occurrence }),
  };
  return { ...info, ...(focus === undefined ? {} : { focus }), ...optional, ...parseExtras(r, o, path) };
}
