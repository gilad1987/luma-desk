/** A beam leaves the thin scenery of its own rig, and still stops on real scenery near its lens. */
import { Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { UP } from '../../../../src/domain/venue';
import { level, quad, sceneryOf, wall } from './sceneryMeshes';

const DOWN = new Vector3(0, -1, 0);
const UPSTAGE = new Vector3(0, 0, -1);
const LENS = new Vector3(0, 8, 0);

/** A truss chord: a level strip 5 cm wide along x at height `y`, moved `z` across. */
const chord = (y: number, z = 0): Mesh =>
  new Mesh(quad([-5, y, z - 0.025], [5, y, z - 0.025], [5, y, z + 0.025], [-5, y, z + 0.025]));

/** A brace of the truss: a strip 5 cm wide along z that goes down from one chord to the next. */
const brace = (top: number, low: number): Mesh =>
  new Mesh(quad([-0.025, top, -0.2], [0.025, top, -0.2], [0.025, low, 0.2], [-0.025, low, 0.2]));

describe('SurfaceHit near the lens', () => {
  it('lands a down wash on the deck when its axis meets a truss chord 1.4 m below the lens', () => {
    const hit = sceneryOf([chord(6.6), level(0)]).surfaces.hit(LENS, DOWN);
    expect(hit?.t).toBeCloseTo(8, 5);
    expect(hit?.normal).toBe(UP);
  });

  it('passes every chord and brace of a truss lattice in a row', () => {
    const lattice = [chord(6.6), brace(6.6, 6.3), chord(6.3), chord(6.3, 0.3), chord(6.6, -0.3)];
    expect(sceneryOf([...lattice, level(0)]).surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(8, 5);
  });

  it('stops on a real wall 2.5 m away, also with a long free throw behind it', () => {
    const from = new Vector3(0, 5, 0);
    expect(sceneryOf([wall(-2.5)]).surfaces.hit(from, UPSTAGE)?.t).toBeCloseTo(2.5, 5);
    expect(sceneryOf([wall(-2.5), wall(-40)]).surfaces.hit(from, UPSTAGE)?.t).toBeCloseTo(2.5, 5);
  });

  it('stops on a platform or on the edge of one 1.4 m below the lens', () => {
    expect(sceneryOf([level(6.6), level(0)]).surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(1.4, 5);
    // 15 cm inside the edge: 73 % of the 0.41 m footprint is on the platform
    const edge = sceneryOf([level(6.6), level(0)]).surfaces.hit(new Vector3(4.85, 8, 0), DOWN);
    expect(edge?.t).toBeCloseTo(1.4, 5);
  });

  it('lets the near zone grow with the throw: a chord 3 m away stops a short throw and not a long one', () => {
    expect(sceneryOf([chord(5), level(0)]).surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(3, 5);
    const high = new Vector3(0, 40, 0);
    expect(sceneryOf([chord(37), level(0)]).surfaces.hit(high, DOWN)?.t).toBeCloseTo(40, 5);
  });

  it('keeps a truss far from the lens as a landing: there it is lit scenery', () => {
    expect(sceneryOf([chord(2), level(0)]).surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(6, 5);
  });

  it('ends a beam in the air when only its own truss is in the way', () => {
    expect(sceneryOf([chord(6.4)]).surfaces.hit(new Vector3(0, 5, 0), new Vector3(0, 1, 0))).toBeNull();
  });
});
