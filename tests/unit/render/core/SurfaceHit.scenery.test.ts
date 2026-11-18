/** Beams on the real meshes of an imported stage: any direction, with the triangle's own normal. */
import { Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { UP } from '../../../../src/domain/venue';
import { level, quad, sceneryOf, wall } from './sceneryMeshes';

const DOWN = new Vector3(0, -1, 0);
const UPSTAGE = new Vector3(0, 0, -1);
const from = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

describe('SurfaceHit on scenery meshes', () => {
  it('lands a downward beam on a slanted mesh, on the slope and not on the top of its box', () => {
    const slope = new Mesh(quad([-5, 0, -5], [5, 0, -5], [5, 10, 5], [-5, 10, 5]));
    const hit = sceneryOf([slope]).surfaces.hit(from(0, 10, 0), DOWN);
    expect(hit?.t).toBeCloseTo(5, 5);
    expect(hit?.normal.toArray()).toEqual([
      expect.closeTo(0, 5),
      expect.closeTo(Math.SQRT1_2, 5),
      expect.closeTo(-Math.SQRT1_2, 5),
    ]);
  });

  it('stops a level beam on a vertical wall, with the normal towards the fixture', () => {
    const hit = sceneryOf([wall(-10)]).surfaces.hit(from(0, 5, 0), UPSTAGE);
    expect(hit?.t).toBeCloseTo(10, 5);
    expect(hit?.normal.toArray()).toEqual([0, 0, 1]);
  });

  it('stops an upward beam under a roof mesh, with the normal down', () => {
    const hit = sceneryOf([level(12)]).surfaces.hit(from(0, 1, 0), new Vector3(0, 1, 0));
    expect(hit?.t).toBeCloseTo(11, 5);
    expect(hit?.normal.toArray()).toEqual([0, -1, 0]);
  });

  it('gives a level mesh the shared UP normal, so the stage lights still find the floor by identity', () => {
    const { surfaces } = sceneryOf([level(1)]);
    const onMesh = surfaces.hit(from(0, 10, 0), DOWN);
    expect([onMesh?.t, onMesh?.normal]).toEqual([9, UP]);
    expect(onMesh?.normal).toBe(UP);
    const beside = surfaces.hit(from(20, 10, 0), DOWN);
    expect(beside?.t).toBe(10);
    expect(beside?.normal).toBe(UP);
  });

  it('lets a beam leave its own mount: a mesh within half a metre of the lens does not stop it', () => {
    const hit = sceneryOf([level(9.8), level(1)]).surfaces.hit(from(0, 10, 0), DOWN);
    expect(hit?.t).toBe(9);
  });

  it('keeps the nearer of a design box and a mesh, and sees a box that is set later', () => {
    const { surfaces } = sceneryOf([level(1)]);
    expect(surfaces.hit(from(0, 10, 0), DOWN)?.t).toBe(9);
    surfaces.setSurfaces([{ min: [-2, 0, -2], max: [2, 3, 2], face: 'top' }]);
    expect(surfaces.hit(from(0, 10, 0), DOWN)?.t).toBe(7);
    surfaces.setSurfaces([{ min: [-2, 0, -2], max: [2, 0.5, 2], face: 'top' }]);
    expect(surfaces.hit(from(0, 10, 0), DOWN)?.t).toBe(9);
  });

  it('gives the same hit for the same ray again, and none for a ray into the open', () => {
    const { surfaces } = sceneryOf([wall(-10)]);
    const first = surfaces.hit(from(1, 5, 0), UPSTAGE);
    const firstValues = [first?.t, first?.normal.toArray()];
    expect(surfaces.hit(from(0, 5, 0), new Vector3(0, 0, 1))).toBeNull();
    expect(surfaces.hit(from(0, 5, 0), new Vector3(0, 0, 1))).toBeNull();
    const again = surfaces.hit(from(1, 5, 0), UPSTAGE);
    expect([again?.t, again?.normal.toArray()]).toEqual(firstValues);
  });

  it('goes back to the boxes alone when the scenery is dropped', () => {
    const { surfaces } = sceneryOf([wall(-10)]);
    surfaces.setScenery(null);
    expect(surfaces.hit(from(0, 5, 0), UPSTAGE)).toBeNull();
  });
});
