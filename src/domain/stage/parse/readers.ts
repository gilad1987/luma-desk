import type { Quat, Vec3 } from '../types';
import type { Choices, FieldReader, Key, NumbersShape } from './fieldReader';
import { describeValue, type Raw } from './rawValues';
import { ARRAY, BOOLEAN, FINITE, OBJECT, POSITIVE, POSITIVE_INT, STRING, type ValueRule } from './valueRules';
import { toUnitQuat, toVec3 } from './vectors';

/**
 * Typed field readers for a stored stage design. Each takes the parent object, the key and the parent's path, so a
 * parser names a field once and the reader builds the error path (`deck.x0`, `trusses[2].id`). A reader returns the
 * checked value, or records an error with the path and the value and returns `undefined`, so the parser collects every
 * problem instead of stopping at the first. The readers are arrow properties, so a parser can pass one to `list` or
 * `optional`.
 */
export class Reader {
  readonly errors: string[] = [];

  fail = (path: string, problem: string): undefined => {
    this.errors.push(`${path}: ${problem}`);
    return undefined;
  };

  /** The path of field `key` in the object at `at`; the stage root has the empty path, so its fields are bare keys. */
  path = (at: string, key: Key): string => {
    if (typeof key === 'number') return `${at}[${key}]`;
    return at === '' ? key : `${at}.${key}`;
  };

  obj = (o: Raw, key: Key, at: string): Raw | undefined => this.check(o, key, at, OBJECT);
  num = (o: Raw, key: Key, at: string): number | undefined => this.check(o, key, at, FINITE);
  positive = (o: Raw, key: Key, at: string): number | undefined => this.check(o, key, at, POSITIVE);
  positiveInt = (o: Raw, key: Key, at: string): number | undefined => this.check(o, key, at, POSITIVE_INT);
  str = (o: Raw, key: Key, at: string): string | undefined => this.check(o, key, at, STRING);
  bool = (o: Raw, key: Key, at: string): boolean | undefined => this.check(o, key, at, BOOLEAN);

  /** Reads every item with `item`; items that fail are left out, and their errors stay recorded. */
  list = <T>(o: Raw, key: Key, at: string, item: FieldReader<T>): T[] | undefined => {
    const items = this.check(o, key, at, ARRAY);
    if (items === undefined) return undefined;
    // An item reader takes (object, key) like a field reader; keyed by index, item i reads like field i.
    const byIndex: Raw = Object.fromEntries(items.entries());
    const path = this.path(at, key);
    return items.map((_, i) => item(byIndex, i, path)).filter((x): x is T => x !== undefined);
  };

  /** An absent key stays absent, so the parsed design has no `undefined` optional fields. */
  optional = <T>(o: Raw, key: Key, at: string, read: FieldReader<T>): T | undefined =>
    o[key] === undefined ? undefined : read(o, key, at);

  oneOf = <T>(o: Raw, key: Key, at: string, choices: Choices<T>): T | undefined => {
    const index = choices.options.findIndex((option) => option === o[key]);
    if (index < 0) return this.fail(this.path(at, key), `unknown ${choices.what} ${describeValue(o[key])}`);
    return choices.options[index];
  };

  vec3 = (o: Raw, key: Key, at: string): Vec3 | undefined =>
    toVec3(this.numbers(o, key, at, { size: 3, item: this.num }));

  /** A box size: every component must be above zero, as a zero or negative size draws nothing. */
  size = (o: Raw, key: Key, at: string): Vec3 | undefined =>
    toVec3(this.numbers(o, key, at, { size: 3, item: this.positive }));

  /** Normalizes on read with `toUnitQuat`, so every stored rotation is a unit quaternion. */
  quat = (o: Raw, key: Key, at: string): Quat | undefined =>
    toUnitQuat(this.numbers(o, key, at, { size: 4, item: this.num }), (problem) =>
      this.fail(this.path(at, key), problem),
    );

  private check<T>(o: Raw, key: Key, at: string, rule: ValueRule<T>): T | undefined {
    const v = o[key];
    return rule.accepts(v) ? v : this.fail(this.path(at, key), `expected ${rule.expected}, got ${describeValue(v)}`);
  }

  /** Reads exactly `size` numbers with `item`; a bad item is reported by its own index. */
  private numbers(o: Raw, key: Key, at: string, { size, item }: NumbersShape): number[] | undefined {
    const v = o[key];
    if (!Array.isArray(v) || v.length !== size) {
      return this.fail(this.path(at, key), `expected ${size} numbers, got ${describeValue(v)}`);
    }
    const read = this.list(o, key, at, item);
    return read?.length === size ? read : undefined;
  }
}
