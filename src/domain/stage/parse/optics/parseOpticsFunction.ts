import type { OpticsCondition, OpticsDrive, OpticsFunction, OpticsRange } from '../../optics/OpticsFunction';
import type { FieldReader, Key } from '../fieldReader';
import { allDefined, type Raw } from '../rawValues';
import type { Reader } from '../readers';

/** One reader per optional field of `T`. */
type Fields<T> = { readonly [K in keyof T]-?: FieldReader<NonNullable<T[K]>> };

/** The optional fields of `fields` that the stored object has; an absent key stays absent. */
export function readOptional<T extends object>(r: Reader, o: Raw, at: string, fields: Fields<T>): Partial<T> {
  const read = Object.entries<FieldReader<unknown>>(fields).map(([key, reader]) => [
    key,
    r.optional(o, key, at, reader),
  ]);
  return Object.fromEntries(read.filter(([, value]) => value !== undefined)) as Partial<T>;
}

/** Exactly three finite numbers: a CIE xyY or a linear sRGB colour. */
export function parseTriple(r: Reader, o: Raw, key: Key, at: string): readonly [number, number, number] | undefined {
  const list = r.list(o, key, at, r.num);
  if (list === undefined) return undefined;
  const [a, b, c] = list;
  if (list.length === 3 && a !== undefined && b !== undefined && c !== undefined) return [a, b, c];
  return r.fail(r.path(at, key), 'expected 3 numbers');
}

function parseDrive(r: Reader, parent: Raw, key: Key, at: string): OpticsDrive | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const drive = { dmxBreak: r.positiveInt(o, 'dmxBreak', path), offset: r.list(o, 'offset', path, r.positiveInt) };
  return allDefined(drive) ? drive : undefined;
}

function parseCondition(r: Reader, parent: Raw, key: Key, at: string): OpticsCondition | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const when = {
    attribute: r.str(o, 'attribute', path),
    drives: r.list(o, 'drives', path, (c, k, p) => parseDrive(r, c, k, p)),
    dmxFrom: r.num(o, 'dmxFrom', path),
    dmxTo: r.num(o, 'dmxTo', path),
  };
  return allDefined(when) ? when : undefined;
}

/** A stored `OpticsFunction`; every field is checked, so a hand-edited show cannot hand a consumer a bad DMX slot. */
export function parseFunction(r: Reader, parent: Raw, key: Key, at: string): OpticsFunction | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const required = {
    attribute: r.str(o, 'attribute', path),
    drives: r.list(o, 'drives', path, (c, k, p) => parseDrive(r, c, k, p)),
    dmxFrom: r.num(o, 'dmxFrom', path),
    dmxTo: r.num(o, 'dmxTo', path),
  };
  const physical = readOptional<Omit<OpticsFunction, keyof typeof required>>(r, o, path, {
    from: r.num,
    to: r.num,
    home: r.num,
    when: (c, k, p) => parseCondition(r, c, k, p),
    label: r.str,
  });
  return allDefined(required) ? { ...required, ...physical } : undefined;
}

/** A stored `OpticsRange`: a function that must have both physical ends. */
export function parseRange(r: Reader, parent: Raw, key: Key, at: string): OpticsRange | undefined {
  const fn = parseFunction(r, parent, key, at);
  if (fn === undefined) return undefined;
  const { from, to } = fn;
  if (from !== undefined && to !== undefined) return { ...fn, from, to };
  return r.fail(r.path(at, key), 'expected a range with from and to');
}

/** The stored object under `key`, after another reader has checked that it is one. */
export function objectAt(parent: Raw, key: Key): Raw {
  const value = parent[key];
  return typeof value === 'object' && value !== null ? (value as Raw) : {};
}
