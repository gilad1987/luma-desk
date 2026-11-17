import type { Fixture } from '../Fixture';
import type { FixtureTypeId } from '../FixtureType';

/**
 * Whether a fixture is a light: every fixture except the LED screen, which has no beam. "All lights" (select-all, the
 * Everything group, look resets) and the stage `lights` query share this one rule.
 */
export function isLight(f: Fixture): boolean {
  return f.type !== 'screen';
}

/**
 * The patched fixtures of one venue. The app builds one rig at boot and passes it to whatever needs it, so tests can
 * build their own. All id lists come back in build order, not id order: groups, the output merge and the golden files
 * depend on that order.
 */
export class Rig {
  /** Every fixture in build order (101.., 801.., 201.., ...). Never sort it. */
  readonly fixtures: readonly Fixture[];
  readonly #byId: ReadonlyMap<number, Fixture>;

  constructor(fixtures: readonly Fixture[]) {
    this.fixtures = fixtures;
    this.#byId = new Map(fixtures.map((f) => [f.id, f]));
  }

  /** The fixture with this id, or undefined: command input and saved shows can name ids the rig does not have. */
  get(id: number): Fixture | undefined {
    return this.#byId.get(id);
  }

  /** The ids from `from` to `to` inclusive that exist, in build order; a range over a gap skips the missing ids. */
  range(from: number, to: number): number[] {
    return this.fixtures.filter((f) => f.id >= from && f.id <= to).map((f) => f.id);
  }

  /** The ids of every fixture of one type, in build order. */
  idsOfType(type: FixtureTypeId): number[] {
    return this.fixtures.filter((f) => f.type === type).map((f) => f.id);
  }

  /**
   * The ids of every fixture except the LED screen, in build order: "all lights" for select-all, the Everything group
   * and look resets. Returns a new array on each call, because callers keep or change it.
   */
  lightIds(): number[] {
    return this.fixtures.filter(isLight).map((f) => f.id);
  }
}
