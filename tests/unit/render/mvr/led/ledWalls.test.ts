/** Wall mapping: one image across the panels of a wall, also when the wall curves in plan or in section. */
import { describe, expect, it } from 'vitest';
import type { PanelPose, V3 } from '../../../../../src/render/mvr/led/ledPose.ts';
import { mapWalls, wallPoint } from '../../../../../src/render/mvr/led/ledWalls.ts';

/** A standing panel that faces +Z, with its local x along `x` (so a panel can be turned in its own plane). */
const panel = (position: V3, x: V3 = [1, 0, 0], pitch = 0.5): PanelPose => {
  const z: V3 = x[0] !== 0 ? [0, -x[0], 0] : [x[1], 0, 0];
  return { position, x, z, normal: [0, 0, 1], pitch };
};

describe('mapWalls', () => {
  it('maps one image across the panels of a wall: a shared edge has one wall point from both panels', () => {
    const turned = panel([0.5, 1, 0], [0, 1, 0]);
    const { coords, walls } = mapWalls([panel([0, 1, 0]), turned, panel([0.5, 1.5, 0]), panel([9, 1, 0])]);
    const [a, b, c, far] = coords;
    if (!a || !b || !c || !far) throw new Error('every panel has a place');
    expect([a.wall, b.wall, c.wall, far.wall]).toEqual([0, 0, 0, 1]);
    // The right edge of the first panel is the left edge of the turned one, whose local x points up.
    const right = wallPoint(a, 0.25, 0);
    const left = wallPoint(b, 0, turned.z[0] > 0 ? -0.25 : 0.25);
    expect(left[0]).toBeCloseTo(right[0]);
    expect(left[1]).toBeCloseTo(right[1]);
    expect(wallPoint(c, 0, 0)).toEqual([0.5, 0.5]);
    expect(walls[0]).toMatchObject({ width: 1, height: 1 });
  });

  it('unrolls a curved wall, so a step along the curve is one panel wide', () => {
    const arc = [-0.4, -0.2, 0, 0.2, 0.4].map((angle): PanelPose => {
      const normal: V3 = [-Math.sin(angle), 0, Math.cos(angle)];
      const position: V3 = [2.5 * Math.sin(angle), 1, -2.5 * Math.cos(angle)];
      return { position, x: [Math.cos(angle), 0, Math.sin(angle)], z: [0, -1, 0], normal, pitch: 0.5 };
    });
    const us = mapWalls(arc).coords.map((coord) => coord.u);
    us.slice(1).forEach((u, index) => expect(u - (us[index] ?? 0)).toBeCloseTo(0.5, 1));
  });

  it('unrolls a wall that runs out into a ramp, so a step up the ramp is one panel long', () => {
    const leans = [0.9, 0.5, 0.2, 0];
    const rises = leans.map((lean): V3 => [0, Math.cos(lean), -Math.sin(lean)]);
    const ramp: PanelPose[] = [];
    leans.forEach((lean, i) => {
      const before: V3 = ramp[i - 1]?.position ?? [0, 0, 2];
      const last = rises[i - 1];
      const rise: V3 = rises[i] ?? [0, 1, 0];
      const step = last ? ([0, 1, 2] as const).map((k) => 0.25 * (last[k] + rise[k])) : [0, 0, 0];
      const position: V3 = [0, before[1] + (step[1] ?? 0), before[2] + (step[2] ?? 0)];
      ramp.push({ position, x: [1, 0, 0], z: rise, normal: [0, Math.sin(lean), Math.cos(lean)], pitch: 0.5 });
    });
    const { coords, walls } = mapWalls(ramp);
    expect(walls).toHaveLength(1);
    const vs = coords.map((coord) => coord.v);
    vs.slice(1).forEach((v, i) => expect(v - (vs[i] ?? 0)).toBeCloseTo(0.5, 1));
    // the ramp panel maps its own length to the wall, not its height: half a metre of panel is half a metre of image
    const first = coords[0];
    if (!first) throw new Error('the ramp panel has a place');
    expect(Math.abs(wallPoint(first, 0, 0.25)[1] - wallPoint(first, 0, -0.25)[1])).toBeCloseTo(0.5);
    expect(walls[0]?.height).toBeCloseTo(2, 1);
  });
});
