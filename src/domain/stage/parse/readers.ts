import type { Quat, Vec3 } from '../types';

/** A JSON object after the object guard; its values stay `unknown` until a reader checks them. */
export type Raw = Readonly<Record<string, unknown>>;

/** A quaternion shorter than this has no direction, so it cannot be normalized to a rotation. */
const MIN_QUAT_LENGTH = 1e-6;

/** Names a bad value in an error message: strings in quotes, so `"5"` and `5` read differently. */
export function describeValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) return String(v);
  if (Array.isArray(v)) return `an array of ${v.length}`;
  return typeof v === 'object' ? 'an object' : `a ${typeof v}`;
}

/**
 * Narrows an object of read results to one where every field was read. A parser reads every field first, so one pass
 * reports every bad field, and only then needs all of them to build its value.
 */
export function allDefined<T extends object>(o: T): o is T & { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.values(o).every((v) => v !== undefined);
}

function isRaw(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Typed readers for a stored stage design. Each reader returns the checked value, or records an error that names the
 * path and the value and returns `undefined`, so the parser collects every problem instead of stopping at the first.
 * The readers are arrow properties, so a parser can pass one as an item reader to `list` or `optional`.
 */
export class Reader {
  readonly errors: string[] = [];

  fail = (path: string, problem: string): undefined => {
    this.errors.push(`${path}: ${problem}`);
    return undefined;
  };

  obj = (v: unknown, path: string): Raw | undefined =>
    isRaw(v) ? v : this.fail(path, `expected an object, got ${describeValue(v)}`);

  /** Reads every item; items that fail are left out, and their errors stay recorded. */
  list = <T>(v: unknown, path: string, item: (v: unknown, path: string) => T | undefined): T[] | undefined => {
    if (!Array.isArray(v)) return this.fail(path, `expected an array, got ${describeValue(v)}`);
    const items: readonly unknown[] = v;
    return items.map((x, i) => item(x, `${path}[${i}]`)).filter((x): x is T => x !== undefined);
  };

  /** An absent key stays absent, so the parsed design has no `undefined` optional fields. */
  optional = <T>(v: unknown, path: string, read: (v: unknown, path: string) => T | undefined): T | undefined =>
    v === undefined ? undefined : read(v, path);

  num = (v: unknown, path: string): number | undefined =>
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : this.fail(path, `expected a finite number, got ${describeValue(v)}`);

  positiveInt = (v: unknown, path: string): number | undefined =>
    typeof v === 'number' && Number.isInteger(v) && v > 0
      ? v
      : this.fail(path, `expected a positive integer, got ${describeValue(v)}`);

  str = (v: unknown, path: string): string | undefined =>
    typeof v === 'string' ? v : this.fail(path, `expected a string, got ${describeValue(v)}`);

  bool = (v: unknown, path: string): boolean | undefined =>
    typeof v === 'boolean' ? v : this.fail(path, `expected true or false, got ${describeValue(v)}`);

  oneOf = <T>(v: unknown, path: string, options: readonly T[], what: string): T | undefined =>
    options.find((o) => o === v) ?? this.fail(path, `unknown ${what} ${describeValue(v)}`);

  vec3 = (v: unknown, path: string): Vec3 | undefined => {
    const [x, y, z] = this.numbers(v, path, 3) ?? [];
    return x === undefined || y === undefined || z === undefined ? undefined : [x, y, z];
  };

  /** Normalizes on read, so every stored rotation is a unit quaternion even after rounding in the JSON. */
  quat = (v: unknown, path: string): Quat | undefined => {
    const [x, y, z, w] = this.numbers(v, path, 4) ?? [];
    if (x === undefined || y === undefined || z === undefined || w === undefined) return undefined;
    const length = Math.hypot(x, y, z, w);
    if (length <= MIN_QUAT_LENGTH) return this.fail(path, `zero-length quaternion [${x}, ${y}, ${z}, ${w}]`);
    return [x / length, y / length, z / length, w / length];
  };

  /** Reads an array of exactly `size` finite numbers; a bad item is reported by its own index. */
  private numbers(v: unknown, path: string, size: number): number[] | undefined {
    if (!Array.isArray(v) || v.length !== size) {
      return this.fail(path, `expected ${size} numbers, got ${describeValue(v)}`);
    }
    const items: readonly unknown[] = v;
    const read = items.map((x, i) => this.num(x, `${path}[${i}]`));
    return read.every((x): x is number => x !== undefined) ? read : undefined;
  }
}
