import type { OpticsColor, OpticsEmitter, OpticsShaping, OpticsSlot, OpticsWheel } from '../../optics/OpticsColor';
import type { FieldReader, Key } from '../fieldReader';
import { allDefined, type Raw } from '../rawValues';
import type { Reader } from '../readers';
import { objectAt, parseFunction, parseTriple, readOptional } from './parseOpticsFunction';

type Colors = Pick<OpticsSlot, 'xyY' | 'rgb'>;

function colors(r: Reader, o: Raw, path: string): Partial<Colors> {
  const triple: FieldReader<readonly [number, number, number]> = (c, k, p) => parseTriple(r, c, k, p);
  return readOptional<Colors>(r, o, path, { xyY: triple, rgb: triple });
}

function parseSlot(r: Reader, parent: Raw, key: Key, at: string): OpticsSlot | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const name = r.str(o, 'name', path);
  const rest = readOptional<Pick<OpticsSlot, 'image' | 'facets' | 'dmxFrom' | 'dmxTo'>>(r, o, path, {
    image: r.str,
    facets: r.positiveInt,
    dmxFrom: r.num,
    dmxTo: r.num,
  });
  return name === undefined ? undefined : { name, ...colors(r, o, path), ...rest };
}

function parseWheel(r: Reader, parent: Raw, key: Key, at: string): OpticsWheel | undefined {
  const fn = parseFunction(r, parent, key, at);
  if (fn === undefined) return undefined;
  const o = objectAt(parent, key);
  const path = r.path(at, key);
  const own = { name: r.str(o, 'name', path), slots: r.list(o, 'slots', path, (c, k, p) => parseSlot(r, c, k, p)) };
  const rotating = readOptional<Pick<OpticsWheel, 'rotating'>>(r, o, path, { rotating: r.bool });
  return allDefined(own) ? { ...fn, ...own, ...rotating } : undefined;
}

function parseEmitter(r: Reader, parent: Raw, key: Key, at: string): OpticsEmitter | undefined {
  const fn = parseFunction(r, parent, key, at);
  if (fn === undefined) return undefined;
  const o = objectAt(parent, key);
  const path = r.path(at, key);
  const rest = readOptional<Pick<OpticsEmitter, 'name' | 'dominantWaveLength'>>(r, o, path, {
    name: r.str,
    dominantWaveLength: r.positive,
  });
  return { ...fn, ...colors(r, o, path), ...rest };
}

/** The wheels under `key` of the object at `at`. */
export function parseWheels(r: Reader, o: Raw, key: Key, at: string): OpticsWheel[] | undefined {
  return r.list(o, key, at, (c, k, p) => parseWheel(r, c, k, p));
}

export function parseColor(r: Reader, parent: Raw, key: Key, at: string): OpticsColor | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const emitters: FieldReader<OpticsEmitter[]> = (c, k, p) => r.list(c, k, p, (i, n, q) => parseEmitter(r, i, n, q));
  return readOptional<OpticsColor>(r, o, r.path(at, key), {
    emitters,
    filters: emitters,
    wheels: (c, k, p) => parseWheels(r, c, k, p),
    correction: (c, k, p) => r.list(c, k, p, (i, n, q) => parseFunction(r, i, n, q)),
  });
}

export function parseShaping(r: Reader, parent: Raw, key: Key, at: string): OpticsShaping | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const fn: FieldReader<NonNullable<OpticsShaping['iris']>> = (c, k, p) => parseFunction(r, c, k, p);
  const fns: FieldReader<NonNullable<OpticsShaping['frost']>> = (c, k, p) => r.list(c, k, p, fn);
  return readOptional<OpticsShaping>(r, o, r.path(at, key), {
    prisms: (c, k, p) => parseWheels(r, c, k, p),
    iris: fn,
    frost: fns,
    blades: fns,
    shutter: fn,
    strobe: fn,
  });
}
