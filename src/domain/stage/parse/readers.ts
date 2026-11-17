import type { Quat, Vec3 } from '../types';
import { describeValue, type Raw } from './rawValues';

/** A quaternion shorter than this has no direction, so it cannot be normalized to a rotation. */
const MIN_QUAT_LENGTH = 1e-6;

/** A stored quaternion this close to unit length is kept as it is, so a saved design reads back bit for bit. */
const UNIT_TOLERANCE = 1e-12;

function isRaw(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toVec3(read: readonly number[] | undefined): Vec3 | undefined {
  const [x, y, z] = read ?? [];
  return x === undefined || y === undefined || z === undefined ? undefined : [x, y, z];
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

  /** A length or count above zero: a zero or negative size would draw nothing or turn a shape inside out. */
  positive = (v: unknown, path: string): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) && v > 0
      ? v
      : this.fail(path, `expected a number greater than 0, got ${describeValue(v)}`);

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

  vec3 = (v: unknown, path: string): Vec3 | undefined => toVec3(this.numbers(v, path, 3, this.num));

  /** A box size: every component must be above zero, see `positive`. */
  size = (v: unknown, path: string): Vec3 | undefined => toVec3(this.numbers(v, path, 3, this.positive));

  /**
   * Normalizes on read, so every stored rotation is a unit quaternion even after rounding in the JSON. A quaternion
   * that is already unit within `UNIT_TOLERANCE` is returned unchanged, so a design survives a save and load exactly.
   */
  quat = (v: unknown, path: string): Quat | undefined => {
    const [x, y, z, w] = this.numbers(v, path, 4, this.num) ?? [];
    if (x === undefined || y === undefined || z === undefined || w === undefined) return undefined;
    const length = Math.hypot(x, y, z, w);
    if (length <= MIN_QUAT_LENGTH) return this.fail(path, `zero-length quaternion [${x}, ${y}, ${z}, ${w}]`);
    if (Math.abs(length - 1) <= UNIT_TOLERANCE) return [x, y, z, w];
    return [x / length, y / length, z / length, w / length];
  };

  /** Reads exactly `size` numbers with `item` (`num` or `positive`); a bad item is reported by its own index. */
  private numbers(v: unknown, path: string, size: number, item: Reader['num']): number[] | undefined {
    if (!Array.isArray(v) || v.length !== size) {
      return this.fail(path, `expected ${size} numbers, got ${describeValue(v)}`);
    }
    const items: readonly unknown[] = v;
    const read = items.map((x, i) => item(x, `${path}[${i}]`));
    return read.every((x): x is number => x !== undefined) ? read : undefined;
  }
}
