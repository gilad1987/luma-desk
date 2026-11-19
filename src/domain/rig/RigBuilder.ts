import { Vector3 } from 'three';
import { lerp, type Vec3Tuple } from '../../core';
import { Fixture, type Mount, type PanTilt } from '../Fixture';
import type { ProductId } from '../fixtureProducts';
import type { FixtureTypeId } from '../FixtureType';
import { Rig } from './Rig';

/** One fixture at one point, as {@link RigBuilder.add} places it. */
export interface PlaceOptions {
  readonly id: number;
  readonly type: FixtureTypeId;
  readonly at: Vec3Tuple;
  readonly mount: Mount;
  /** The rigged pan/tilt of a static unit; absent or undefined for a moving one. */
  readonly fixed?: PanTilt | undefined;
  /** The catalogue product the fixture is; absent or undefined for a plain fixture of `type`. */
  readonly product?: ProductId | undefined;
}

/** One evenly spaced row of identical fixtures, the way the truss, deck and audience areas lay theirs out. */
export interface RowOptions {
  /** The id of the first fixture; the rest of the row counts up from it. */
  readonly firstId: number;
  readonly count: number;
  readonly type: FixtureTypeId;
  /** The x of the first and the last fixture; a row of one sits at the midpoint. */
  readonly x: readonly [first: number, last: number];
  readonly y: number;
  readonly z: number;
  readonly mount: Mount;
  /** The rigged pan/tilt of a static row. */
  readonly fixed?: PanTilt;
}

/**
 * Collects fixtures in the order the rig areas add them. That order is the rig's build order, which groups, the output
 * merge and the golden files depend on, so the builder never sorts.
 */
export class RigBuilder {
  readonly #fixtures: Fixture[] = [];

  /** Adds one fixture at a position. */
  add({ id, type, at: [x, y, z], mount, fixed, product }: PlaceOptions): Fixture {
    const fixture = new Fixture({ id, type, pos: new Vector3(x, y, z), mount, fixed: fixed ?? null, product });
    this.#fixtures.push(fixture);
    return fixture;
  }

  /**
   * Adds a row of fixtures with consecutive ids, spread evenly along x. Each fixture gets its own copy of `fixed`, as
   * the original build did, so no two fixtures share one object.
   */
  row({ firstId, count, type, x: [x0, x1], y, z, mount, fixed }: RowOptions): number[] {
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (count - 1));
      ids.push(this.add({ id: firstId + i, type, at: [x, y, z], mount, fixed: fixed ? { ...fixed } : undefined }).id);
    }
    return ids;
  }

  /** A rig of every fixture added so far, in the order they were added. Later `add` calls do not change it. */
  build(): Rig {
    return new Rig([...this.#fixtures]);
  }
}
