import { BoxGeometry, type Object3D, type Vector3 } from 'three';
import { lerp } from '../../core';
import { terrainHeight } from '../../domain/audienceTerrain';
import { addMesh } from '../shared';
import type { CrenelPlacement } from './crenellation';
import type { JerusalemStone } from './JerusalemStone';

const WALL_HEIGHT = 14;

/** A wall run from corner `A` to corner `B`, with its ground length `L` and heading `ang` about the up axis. */
export interface WallRun {
  readonly A: Vector3;
  readonly B: Vector3;
  readonly L: number;
  readonly ang: number;
}

/** Builds one run as about 6 m sections whose base follows the terrain; returns 3 merlons per section. */
export function addWallSections(scene: Object3D, stone: JerusalemStone, { A, B, L, ang }: WallRun): CrenelPlacement[] {
  const merlons: CrenelPlacement[] = [],
    n = Math.ceil(L / 6),
    H = WALL_HEIGHT;
  for (let k = 0; k < n; k++) {
    const t0 = k / n,
      t1 = (k + 1) / n,
      x = lerp(A.x, B.x, (t0 + t1) / 2),
      z = lerp(A.z, B.z, (t0 + t1) / 2),
      base =
        Math.min(
          terrainHeight(lerp(A.x, B.x, t0), lerp(A.z, B.z, t0)),
          terrainHeight(lerp(A.x, B.x, t1), lerp(A.z, B.z, t1)),
        ) - 3;
    addMesh(scene, new BoxGeometry(2.4, H, L / n + 0.05), stone.floodlit(L / n, H), {
      position: [x, base + H / 2, z],
      rotation: [0, ang, 0],
    });
    for (let c = 0; c < 3; c++) {
      const tt = lerp(t0, t1, (c + 0.5) / 3);
      merlons.push([lerp(A.x, B.x, tt), base + H + 0.65, lerp(A.z, B.z, tt), ang]);
    }
  }
  return merlons;
}
