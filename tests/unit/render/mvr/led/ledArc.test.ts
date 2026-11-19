/**
 * Curved walls unroll by arc length along the neighbour chain: at any bend up to a full circle a step along the wall
 * is one panel wide, the width is the arc and not the chord, and all panels keep to one side of the wall.
 */
import { describe, expect, it } from 'vitest';
import type { PanelPose, V3 } from '../../../../../src/render/mvr/led/ledPose.ts';
import { dot } from '../../../../../src/render/mvr/led/ledPose.ts';
import { mapWalls } from '../../../../../src/render/mvr/led/ledWalls.ts';

const PITCH = 0.5;
const ROWS = 3;

/** A panel of an arc wall with where it is in the grid; `inward` is the direction to the arc's axis. */
interface ArcPanel extends PanelPose {
  readonly column: number;
  readonly row: number;
  readonly inward: V3;
}

/**
 * An arc of flat tiles that meet at their edges, `columns` wide and three rows high, bent by `degrees` in all. The
 * file order is mixed and every third normal is turned round, as a file gives them.
 */
function arcWall(degrees: number, columns: number): ArcPanel[] {
  const bend = ((degrees / columns) * Math.PI) / 180;
  const radius = PITCH / 2 / Math.tan(bend / 2);
  const panels: ArcPanel[] = [];
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const angle = (column - (columns - 1) / 2) * bend;
      const inward: V3 = [-Math.sin(angle), 0, Math.cos(angle)];
      const turned = (column + row) % 3 === 0 ? -1 : 1;
      panels.push({
        position: [radius * Math.sin(angle), 1 + row * PITCH, -radius * Math.cos(angle)],
        x: [Math.cos(angle), 0, Math.sin(angle)],
        z: [0, -1, 0],
        normal: [inward[0] * turned, 0, inward[2] * turned],
        pitch: PITCH,
        column,
        row,
        inward,
      });
    }
  }
  // file order: the odd columns first, from the far end, then the even ones
  return [...panels.filter((p) => p.column % 2 === 1).reverse(), ...panels.filter((p) => p.column % 2 === 0)];
}

describe('mapWalls on a curved wall', () => {
  it.each([
    [46, 8],
    [115, 20],
    [180, 32],
    [270, 48],
  ])('unrolls an arc of %i degrees: steps of one panel, the arc as its width', (degrees, columns) => {
    const panels = arcWall(degrees, columns);
    const { coords, walls } = mapWalls(panels);
    expect(walls).toHaveLength(1);
    const placed = panels.map((panel, index) => ({ panel, coord: coords[index] }));
    for (let row = 0; row < ROWS; row += 1) {
      const us = placed
        .filter(({ panel }) => panel.row === row)
        .sort((a, b) => a.panel.column - b.panel.column)
        .map(({ coord }) => coord?.u ?? NaN);
      const steps = us.slice(1).map((u, index) => Math.abs(u - (us[index] ?? NaN)));
      // within 2 % of one panel
      for (const one of steps) expect(Math.abs(one - PITCH)).toBeLessThanOrEqual(0.02 * PITCH);
    }
    const arc = columns * PITCH;
    expect(Math.abs((walls[0]?.width ?? 0) - arc)).toBeLessThanOrEqual(0.02 * arc);
    expect(walls[0]?.height).toBeCloseTo(ROWS * PITCH, 5);
    // every panel emits to one side of the wall: its own normal times `side` is inward for all, or outward for all
    const sides = new Set(
      placed.map(({ panel, coord }) => Math.sign(dot(panel.normal, panel.inward)) * (coord?.side ?? 0)),
    );
    expect(sides.size).toBe(1);
  });

  it('keeps one side and one seam for a wall that closes into a full circle', () => {
    const panels = arcWall(360, 64);
    const { coords, walls } = mapWalls(panels);
    expect(walls).toHaveLength(1);
    const sides = new Set(
      panels.map((panel, i) => Math.sign(dot(panel.normal, panel.inward)) * (coords[i]?.side ?? 0)),
    );
    expect(sides.size).toBe(1);
    expect(Math.abs((walls[0]?.width ?? 0) - 64 * PITCH)).toBeLessThanOrEqual(0.02 * 64 * PITCH + PITCH);
  });
});
