import { BufferGeometry, Float32BufferAttribute, Group, Mesh, type Object3D } from 'three';
import { SurfaceHit } from '../../../../src/render/surface/SurfaceHit';

type Point = readonly [number, number, number];

/** A flat four-corner geometry as two indexed triangles. */
export function quad(a: Point, b: Point, c: Point, d: Point): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

/** A wall across the stage at depth `z`: 10 m wide around x = 0, from the floor up to 10 m. */
export const wall = (z: number): Mesh => new Mesh(quad([-5, 0, z], [5, 0, z], [5, 10, z], [-5, 10, z]));

/** A level sheet at height `y`: 10 m by 10 m around the stage centre. */
export const level = (y: number): Mesh => new Mesh(quad([-5, y, -5], [5, y, -5], [5, y, 5], [-5, y, 5]));

/**
 * A scenery root with one layer group per list of meshes, as `MvrStage` builds it, and the surfaces of an imported
 * stage that read it: no boxes, a flat venue floor at y = 0.
 */
export function sceneryOf(...layers: Object3D[][]): { surfaces: SurfaceHit; layers: Group[]; root: Group } {
  const root = new Group();
  const groups = layers.map((meshes) => new Group().add(...meshes));
  root.add(...groups);
  const surfaces = new SurfaceHit();
  surfaces.setVenue('mvr');
  surfaces.setSurfaces([]);
  surfaces.setScenery(root);
  return { surfaces, layers: groups, root };
}
