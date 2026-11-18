/** The two joins render needs for an imported stage: beam surfaces and the camera-fit box. */
import { describe, expect, it } from 'vitest';
import { boundsOf } from '../../../../src/domain/stage/bounds.ts';
import { surfacesOf } from '../../../../src/domain/stage/surfaces.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import type { SurfaceBox } from '../../../../src/domain/stage/types.ts';
import type { MvrGeometry } from '../../../../src/mvr/index.ts';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds.ts';
import { mvrSurfaces } from '../../../../src/render/mvr/mvrSurfaces.ts';

const design = createTemplate('festival');
const table: SurfaceBox = { min: [20, 0, 20], max: [22, 0.8, 21], face: 'top' };
const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-1, -2, -3], max: [30, 1, 25] },
  surfaces: [table],
};

describe('mvrSurfaces', () => {
  it('gives the design surfaces first, then the mesh tops, for one setSurfaces call', () => {
    expect(mvrSurfaces(design, geometry)).toEqual([...surfacesOf(design), table]);
  });
});

describe('mvrCameraBounds', () => {
  it('joins the design box with the scenery box per axis', () => {
    const own = boundsOf(design);
    const joined = mvrCameraBounds(design, geometry);
    expect(joined.min).toEqual(own.min.map((value, axis) => Math.min(value, geometry.bounds.min[axis] ?? NaN)));
    expect(joined.max).toEqual(own.max.map((value, axis) => Math.max(value, geometry.bounds.max[axis] ?? NaN)));
  });
});
