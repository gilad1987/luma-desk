/** A beam near its lens: a performer always stops it, the class of a mesh decides, and a free ray costs one trace. */
import { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { MeshInstances } from '../../../../src/render/surface/MeshInstances';
import { CLASS_KEY } from '../../../../src/render/surface/rigKind';
import { level, quad, sceneryOf, wall } from './sceneryMeshes';

const DOWN = new Vector3(0, -1, 0);
const ACROSS = new Vector3(1, 0, 0);
const UPSTAGE = new Vector3(0, 0, -1);
const LENS = new Vector3(0, 8, 0);
/** A side light at chest height, one metre over a deck that it does not point at. */
const SIDE = new Vector3(-6, 1, 0);

const classed = (mesh: Mesh, sceneryClass: string): Mesh => {
  mesh.material = new MeshStandardMaterial();
  mesh.material.userData[CLASS_KEY] = sceneryClass;
  return mesh;
};

/** A performer as a sheet across the beam: `width` wide, 1.7 m tall, `distance` metres in front of `SIDE`. */
const figure = (distance: number, width = 0.45): Mesh => {
  const x = SIDE.x + distance;
  return new Mesh(quad([x, 0, -width / 2], [x, 0, width / 2], [x, 1.7, width / 2], [x, 1.7, -width / 2]));
};

/** A truss chord: a level strip 5 cm wide along x, 1.4 m below `LENS`. */
const chord = (): Mesh => new Mesh(quad([-5, 6.6, -0.025], [5, 6.6, -0.025], [5, 6.6, 0.025], [-5, 6.6, 0.025]));

describe('SurfaceHit near the lens, by evidence', () => {
  it.each([1.5, 3, 4, 4.9])('stops a side light on a performer %f m away with open space behind', (distance) => {
    expect(sceneryOf([figure(distance)]).surfaces.hit(SIDE, ACROSS)?.t).toBeCloseTo(distance, 5);
    const named = sceneryOf([classed(figure(distance), 'figure')]);
    expect(named.surfaces.hit(SIDE, ACROSS)?.t).toBeCloseTo(distance, 5);
  });

  it('never passes a thing of a figure, deck, wall or cloth class, however thin it is', () => {
    for (const name of ['figure', 'deck', 'wall', 'cloth']) {
      const thin = sceneryOf([classed(figure(1, 0.05), name), wall(-40)]);
      expect(thin.surfaces.hit(SIDE, ACROSS)?.t).toBeCloseTo(1, 5);
    }
    // the same strip with no class is thin scenery of the rig: the footprint goes past it
    expect(sceneryOf([figure(1, 0.05)]).surfaces.hit(SIDE, ACROSS)).toBeNull();
  });

  it('passes a truss chord 1.4 m below the lens and lands on the deck', () => {
    expect(sceneryOf([classed(chord(), 'truss'), level(0)]).surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(8, 5);
    expect(sceneryOf([chord(), level(0)]).surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(8, 5);
  });

  it('passes a truss class plate that the footprint alone would land on', () => {
    // a gusset plate 1 m wide under the lens: more than half of the disc, and still the rig the light hangs in
    const plate = new Mesh(quad([-0.5, 6.6, -0.5], [0.5, 6.6, -0.5], [0.5, 6.6, 0.5], [-0.5, 6.6, 0.5]));
    expect(sceneryOf([classed(plate, 'truss'), level(0)]).surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(8, 5);
  });

  it('stops on a real wall 2.5 m away, with and without a class', () => {
    const from = new Vector3(0, 5, 0);
    expect(sceneryOf([wall(-2.5)]).surfaces.hit(from, UPSTAGE)?.t).toBeCloseTo(2.5, 5);
    expect(sceneryOf([classed(wall(-2.5), 'wall'), wall(-40)]).surfaces.hit(from, UPSTAGE)?.t).toBeCloseTo(2.5, 5);
  });

  it('traces a ray with no hit near the lens once', () => {
    const trace = vi.spyOn(MeshInstances.prototype, 'trace');
    try {
      const { surfaces } = sceneryOf([level(0)]);
      trace.mockClear();
      expect(surfaces.hit(LENS, DOWN)?.t).toBeCloseTo(8, 5);
      expect(trace).toHaveBeenCalledTimes(1);
      trace.mockClear();
      // nothing in the way at all
      expect(surfaces.hit(new Vector3(0, 8, 0), new Vector3(0, 1, 0))).toBeNull();
      expect(trace).toHaveBeenCalledTimes(1);
    } finally {
      trace.mockRestore();
    }
  });
});
