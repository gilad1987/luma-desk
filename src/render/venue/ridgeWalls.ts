import { BoxGeometry, Vector3, type Object3D } from 'three';
import { lerp } from '../../core';
import { terrainHeight } from '../../domain/audienceTerrain';
import { addMesh } from '../shared';
import type { CrenelPlacement } from './crenellation';
import type { JerusalemStone } from './JerusalemStone';

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

const WALL_HEIGHT = 14;
const TOWER_HEIGHT = 20;

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
      const L = Math.hypot(B.x - A.x, B.z - A.z),
        ang = Math.atan2(B.x - A.x, B.z - A.z);
      const n = Math.ceil(L / 6);
      for (let k = 0; k < n; k++) {
        const t0 = k / n,
          t1 = (k + 1) / n,
          x = lerp(A.x, B.x, (t0 + t1) / 2),
          z = lerp(A.z, B.z, (t0 + t1) / 2),
          base =
            Math.min(
              terrainHeight(lerp(A.x, B.x, t0), lerp(A.z, B.z, t0)),
              terrainHeight(lerp(A.x, B.x, t1), lerp(A.z, B.z, t1)),
            ) - 3,
          H = WALL_HEIGHT;
        addMesh(scene, new BoxGeometry(2.4, H, L / n + 0.05), stone.floodlit(L / n, H), {
          position: [x, base + H / 2, z],
          rotation: [0, ang, 0],
        });
        for (let c = 0; c < 3; c++) {
          const tt = lerp(t0, t1, (c + 0.5) / 3);
          merlons.push([lerp(A.x, B.x, tt), base + H + 0.65, lerp(A.z, B.z, tt), ang]);
        }
      }
      if (i > 0) {
        const H = TOWER_HEIGHT,
          base = A.y - 3;
        addMesh(scene, new BoxGeometry(8, H, 8), stone.floodlit(8, H), {
          position: [A.x, base + H / 2, A.z],
          rotation: [0, ang, 0],
        });
        for (const [dx, dz] of TOWER_MERLONS) merlons.push([A.x + dx, base + H + 0.65, A.z + dz, ang]);
      }
    }
  }
  return merlons;
}
