/** Scenery without triangles: beams take the box path and every walk ends, where an empty tree once looped forever. */
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Bvh } from '../../../../src/render/surface/Bvh';
import { buildBvh } from '../../../../src/render/surface/buildBvh';
import { walk } from '../../../../src/render/surface/bvhWalk';
import { Ray } from '../../../../src/render/surface/Ray';
import { SceneryHit } from '../../../../src/render/surface/SceneryHit';
import { SurfaceHit } from '../../../../src/render/surface/SurfaceHit';
import { quad, sceneryOf } from './sceneryMeshes';

/** A synchronous loop cannot be cut by vitest, but a fixed walk ends in microseconds: a slow one shows the loop. */
const FAST = 1000;
const DOWN = new Vector3(0, -1, 0);
const ABOVE = new Vector3(0, 5, 0);

/** The flat venue floor 5 m under the ray: the box path's hit. */
const floorT = (surfaces: SurfaceHit): number | undefined => surfaces.hit(ABOVE, DOWN)?.t;

/** A geometry with two corners: no whole triangle. */
function twoCorners(): BufferGeometry {
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
}

describe('SurfaceHit on scenery without triangles', () => {
  it('takes the box hit for a root with no layers', { timeout: FAST }, () => {
    const surfaces = new SurfaceHit();
    surfaces.setVenue('mvr');
    surfaces.setSurfaces([]);
    surfaces.setScenery(new Group());
    expect(floorT(surfaces)).toBeCloseTo(5, 5);
  });

  it('takes the box hit for an empty layer and for meshes with no triangles', { timeout: FAST }, () => {
    expect(floorT(sceneryOf([]).surfaces)).toBeCloseTo(5, 5);
    expect(floorT(sceneryOf([new Mesh(new BufferGeometry())]).surfaces)).toBeCloseTo(5, 5);
    expect(floorT(sceneryOf([new Mesh(twoCorners())]).surfaces)).toBeCloseTo(5, 5);
  });

  it('lets a beam pass triangles with no area', { timeout: FAST }, () => {
    const flat = quad([-5, 2, 0], [0, 2, 0], [5, 2, 0], [5, 2, 0]);
    const { surfaces } = sceneryOf([new Mesh(flat), new Mesh(quad([0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]))]);
    expect(floorT(surfaces)).toBeCloseTo(5, 5);
  });

  it('ends the mesh walk of an empty layer and keeps the other hit', { timeout: FAST }, () => {
    const scenery = new SceneryHit(new Group().add(new Group()));
    expect(scenery.recall(ABOVE, DOWN)).toBeUndefined();
    expect(scenery.resolve(ABOVE, DOWN, { t: 5, normal: DOWN })?.t).toBe(5);
    expect(scenery.resolve(new Vector3(0, 9, 0), DOWN, null)).toBeNull();
  });
});

describe('walk', () => {
  const ray = new Ray();
  const leaf = { test: (): void => undefined };
  const stack = new Uint32Array(96);

  it('ends at once on a tree with no boxes', { timeout: FAST }, () => {
    ray.set(ABOVE, DOWN, 0, Infinity);
    walk(buildBvh(new Float32Array(0)), ray, leaf, stack);
    expect(ray.prim).toBe(-1);
  });

  it('ends on a node array whose inner nodes link back', { timeout: FAST }, () => {
    const box = [-1, -1, -1, 1, 1, 1];
    const bounds = new Float32Array([...box, ...box, ...box]);
    const looped: Bvh[] = [
      { bounds, links: new Uint32Array([0, 0, 0, 0, 0, 0]), order: new Uint32Array(1) },
      { bounds, links: new Uint32Array([1, 0, 0, 0, 1, 0]), order: new Uint32Array(1) },
    ];
    ray.set(new Vector3(), DOWN, 0, Infinity);
    for (const bvh of looped) walk(bvh, ray, leaf, stack);
    expect(ray.prim).toBe(-1);
  });
});
