import { Vector3 } from 'three';
import { lerp } from '../../core';
import { Fixture, type Mount, type PanTilt } from '../Fixture';
import type { FixtureTypeId } from '../FixtureType';
import { Rig } from './Rig';

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
  private readonly fixtures: Fixture[] = [];

  /** Adds one fixture at a position; `fixed` is the rigged pan/tilt of a static unit. */
  add(id: number, type: FixtureTypeId, x: number, y: number, z: number, mount: Mount, fixed?: PanTilt): Fixture {
    const fixture = new Fixture(id, type, new Vector3(x, y, z), mount, fixed ?? null);
    this.fixtures.push(fixture);
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
      ids.push(this.add(firstId + i, type, x, y, z, mount, fixed ? { ...fixed } : undefined).id);
    }
    return ids;
  }

  /** A rig of every fixture added so far, in the order they were added. Later `add` calls do not change it. */
  build(): Rig {
    return new Rig([...this.fixtures]);
  }
}
