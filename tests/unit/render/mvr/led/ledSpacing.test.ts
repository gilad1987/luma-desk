/**
 * Tiles that are not square: the pitch is their short side, so the walls are joined with the second spacing of the
 * grid. A grid of 0.5 m by 1.0 m tiles is one wall, and a gap beside it still parts two walls.
 */
import { describe, expect, it } from 'vitest';
import type { PanelPose, V3 } from '../../../../../src/render/mvr/led/ledPose.ts';
import { withGridSpacing } from '../../../../../src/render/mvr/led/ledSpacing.ts';
import { mapWalls } from '../../../../../src/render/mvr/led/ledWalls.ts';

/** A standing grid that faces +Z: `columns` by `rows`, `dx` and `dy` metres apart, the pitch being the shorter. */
function grid(columns: number, rows: number, spacing: readonly [number, number], from: V3 = [0, 1, 0]): PanelPose[] {
  const [dx, dy] = spacing;
  return Array.from({ length: columns * rows }, (_, i): PanelPose => {
    const position: V3 = [from[0] + (i % columns) * dx, from[1] + Math.floor(i / columns) * dy, from[2]];
    return { position, x: [1, 0, 0], z: [0, -1, 0], normal: [0, 0, 1], pitch: Math.min(dx, dy) };
  });
}

describe('withGridSpacing', () => {
  it('finds the long spacing of a grid of tiles that are not square, and none for a square grid or a row', () => {
    const tall = withGridSpacing(grid(6, 4, [0.5, 1]));
    expect(tall.map((panel) => panel.across?.pitch)).toEqual(Array(24).fill(1));
    expect(tall.every((panel) => Math.abs(panel.across?.along[1] ?? 0) === 1)).toBe(true);
    expect(withGridSpacing(grid(6, 4, [0.5, 0.5])).some((panel) => panel.across)).toBe(false);
    expect(withGridSpacing(grid(6, 1, [0.5, 1])).some((panel) => panel.across)).toBe(false);
  });
});

describe('mapWalls on tiles that are not square', () => {
  it('makes one wall of a 6 by 4 grid with 0.5 m by 1.0 m spacing, mapped in metres both ways', () => {
    const { coords, walls } = mapWalls(grid(6, 4, [0.5, 1]));
    expect(walls).toHaveLength(1);
    expect([walls[0]?.width, walls[0]?.height]).toEqual([3, 3.5]);
    expect([coords[0]?.u, coords[0]?.v, coords[23]?.u, coords[23]?.v]).toEqual([0, 0, 2.5, 3]);
  });

  it('makes one wall of wide tiles too, and keeps two screens with a gap between them apart', () => {
    expect(mapWalls(grid(4, 6, [1, 0.5])).walls).toHaveLength(1);
    // two screens of 0.5 by 1.0 tiles in one plane, 1 m of air between them: 1.5 m from centre to centre
    const pair = [...grid(3, 2, [0.5, 1]), ...grid(3, 2, [0.5, 1], [2.5, 1, 0])];
    expect(mapWalls(pair).walls).toHaveLength(2);
    // a square grid one long step above another is two walls, as before
    const stacked = [...grid(4, 2, [0.5, 0.5]), ...grid(4, 2, [0.5, 0.5], [0, 2.5, 0])];
    expect(mapWalls(stacked).walls).toHaveLength(2);
  });
});
