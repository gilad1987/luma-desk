import type { JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';
import { place, type Vec3 } from './affine';
import type { MvrProbe } from './probeMvr';
import { toThree } from './threeFrame';

/** `__desk.test.mvrSceneryBoxes()` written out: one drawn layer group's world box, metres, Y up, fit offset in. */
export interface DrawnSceneryBox {
  layer: string;
  min: Vec3;
  max: Vec3;
}

/** Reads the drawn layer boxes; the shared `DeskTestApi` type leaves this accessor out, so this one place widens it. */
export function drawnSceneryBoxes(desk: JSHandle<DeskTestApi>): Promise<DrawnSceneryBox[]> {
  return desk.evaluate((d) => (d as DeskTestApi & { mvrSceneryBoxes(): DrawnSceneryBox[] }).mvrSceneryBoxes());
}

/** The 8 corners of the box between `min` and `max`. */
const corners = ([a, b]: readonly [Vec3, Vec3]): Vec3[] =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((i): Vec3 => [i & 1 ? b[0] : a[0], i & 2 ? b[1] : a[1], i & 4 ? b[2] : a[2]]);

/**
 * Where the file puts the meshes of `layer`, as the box of their placed corners in the app's frame: each mesh's known
 * box (mm, by file name) through the probe's matrix, to metres and Y up, plus the app's fit offset.
 */
export function probeLayerBox(
  probe: MvrProbe,
  layer: string,
  boxes: Readonly<Record<string, readonly [Vec3, Vec3]>>,
  offset: Vec3,
): DrawnSceneryBox {
  const points = probe.meshes
    .filter((m) => m.layer === layer)
    .flatMap((m) => {
      const box = boxes[m.fileName];
      if (!box) throw new Error(`no known box for ${m.fileName} in layer ${layer}`);
      return corners(box).map((p) => toThree(place(m.matrix, p)).map((v, i) => v + (offset[i] ?? 0)));
    });
  if (points.length === 0) throw new Error(`the probe places no mesh in layer ${layer}`);
  const along = (i: number): number[] => points.map((p) => p[i] ?? 0);
  const min: Vec3 = [Math.min(...along(0)), Math.min(...along(1)), Math.min(...along(2))];
  const max: Vec3 = [Math.max(...along(0)), Math.max(...along(1)), Math.max(...along(2))];
  return { layer, min, max };
}
