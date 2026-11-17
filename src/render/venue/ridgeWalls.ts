import { BoxGeometry, Vector3, type Object3D } from 'three';
import { terrainHeight } from '../../domain/audienceTerrain';
import { addMesh } from '../shared';
import type { CrenelPlacement } from './crenellation';
import type { JerusalemStone } from './JerusalemStone';
import { addWallSections, type WallRun } from './wallSections';

/** The two wall lines on the ridges left and right of the valley, as [x, z] corner points. */
const WALLS: readonly (readonly (readonly [x: number, z: number])[])[] = [
  [
    [-58, -95],
    [-74, -50],
    [-82, -5],
    [-84, 40],
    [-74, 85],
    [-48, 118],
  ],
  [
    [56, -95],
    [72, -52],
    [82, -8],
    [85, 38],
    [76, 84],
    [52, 118],
  ],
];

/** The merlon offsets around the top of a corner tower. */
const TOWER_MERLONS: readonly (readonly [dx: number, dz: number])[] = [
  [-3.4, -3.4],
  [3.4, -3.4],
  [-3.4, 3.4],
  [3.4, 3.4],
  [0, -3.4],
  [0, 3.4],
  [-3.4, 0],
  [3.4, 0],
];

const TOWER_HEIGHT = 20;

/** Builds the square tower at the run's start corner, turned like the run; returns its 8 merlons. */
function addCornerTower(scene: Object3D, stone: JerusalemStone, { A, ang }: WallRun): CrenelPlacement[] {
  const H = TOWER_HEIGHT,
    base = A.y - 3;
  addMesh(scene, new BoxGeometry(8, H, 8), stone.floodlit(8, H), {
    position: [A.x, base + H / 2, A.z],
    rotation: [0, ang, 0],
  });
  return TOWER_MERLONS.map(([dx, dz]) => [A.x + dx, base + H + 0.65, A.z + dz, ang]);
}

/**
 * Builds the Old City wall lines: about 6 m wall sections that follow the terrain, with a square tower at every
 * inner corner. It returns the merlon placements in build order (3 per section, 8 per tower).
 */
export function buildRidgeWalls(scene: Object3D, stone: JerusalemStone): CrenelPlacement[] {
  const merlons: CrenelPlacement[] = [];
  for (const raw of WALLS) {
    const pts = raw.map(([x, z]) => new Vector3(x, terrainHeight(x, z), z));
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i],
        B = pts[i + 1];
      if (!A || !B) continue;
      const run = { A, B, L: Math.hypot(B.x - A.x, B.z - A.z), ang: Math.atan2(B.x - A.x, B.z - A.z) };
      merlons.push(...addWallSections(scene, stone, run));
      if (i > 0) merlons.push(...addCornerTower(scene, stone, run));
    }
  }
  return merlons;
}
