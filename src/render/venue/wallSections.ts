import { BoxGeometry, type Object3D, type Vector3 } from 'three';
import { lerp } from '../../core';
import { terrainHeight } from '../../domain/audienceTerrain';
import { addMesh } from '../shared';
import type { CrenelPlacement } from './crenellation';
import type { JerusalemStone } from './JerusalemStone';

const WALL_HEIGHT = 14;

/**
 * A wall run from corner `start` to corner `end`, with its ground `length` and `heading` about the up axis. The caller
 * computes length and heading once: the sections need both; the corner tower needs the heading.
 */
export interface WallRun {
  readonly start: Vector3;
  readonly end: Vector3;
  readonly length: number;
  readonly heading: number;
}

/** Builds one run as about 6 m sections whose base follows the terrain; returns 3 merlons per section. */
export function addWallSections(scene: Object3D, stone: JerusalemStone, run: WallRun): CrenelPlacement[] {
  const { start, end, length, heading } = run;
  const merlons: CrenelPlacement[] = [],
    n = Math.ceil(length / 6),
    H = WALL_HEIGHT;
  for (let k = 0; k < n; k++) {
    const t0 = k / n,
      t1 = (k + 1) / n,
      x = lerp(start.x, end.x, (t0 + t1) / 2),
      z = lerp(start.z, end.z, (t0 + t1) / 2),
      base =
        Math.min(
          terrainHeight(lerp(start.x, end.x, t0), lerp(start.z, end.z, t0)),
          terrainHeight(lerp(start.x, end.x, t1), lerp(start.z, end.z, t1)),
        ) - 3;
    addMesh(scene, new BoxGeometry(2.4, H, length / n + 0.05), stone.floodlit(length / n, H), {
      position: [x, base + H / 2, z],
      rotation: [0, heading, 0],
    });
    for (let c = 0; c < 3; c++) {
      const tt = lerp(t0, t1, (c + 0.5) / 3);
      merlons.push([lerp(start.x, end.x, tt), base + H + 0.65, lerp(start.z, end.z, tt), heading]);
    }
  }
  return merlons;
}
