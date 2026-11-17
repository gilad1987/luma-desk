import { Vector3 } from 'three';
import { lerp } from '../../core';
import { Fixture, type Mount, type PanTilt } from '../Fixture';
import type { FixtureTypeId } from '../FixtureType';
import { Rig } from './Rig';

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
   * Adds `n` fixtures with consecutive ids spread evenly from x0 to x1 (one fixture sits at the midpoint). Each fixture
   * gets its own copy of `fixed`, because the rig aims some of them one by one.
   */
  row(
    start: number,
    n: number,
    type: FixtureTypeId,
    x0: number,
    x1: number,
    y: number,
    z: number,
    mount: Mount,
    fixed?: PanTilt,
  ): number[] {
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (n - 1));
      ids.push(this.add(start + i, type, x, y, z, mount, fixed ? { ...fixed } : undefined).id);
    }
    return ids;
  }

  /** The rig of every fixture added so far, in the order they were added. */
  build(): Rig {
    return new Rig(this.fixtures);
  }
}
