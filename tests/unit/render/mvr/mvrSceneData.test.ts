/** The join render needs for an imported stage's beam surfaces; `mvrCameraBounds.test.ts` covers the camera box. */
import { describe, expect, it } from 'vitest';
import { surfacesOf } from '../../../../src/domain/stage/surfaces.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import type { SurfaceBox } from '../../../../src/domain/stage/types.ts';
import type { MvrGeometry } from '../../../../src/mvr/index.ts';
import { mvrSurfaces } from '../../../../src/render/mvr/mvrSurfaces.ts';

const design = createTemplate('festival');
const table: SurfaceBox = { min: [20, 0, 20], max: [22, 0.8, 21], face: 'top' };
const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-1, -2, -3], max: [30, 1, 25] },
  layers: [],
  hallLayers: [],
  surfaces: [table],
};

describe('mvrSurfaces', () => {
  it('gives the design surfaces and no mesh box top: beams meet the real triangles instead', () => {
    expect(geometry.surfaces).toEqual([table]);
    expect(mvrSurfaces(design)).toEqual(surfacesOf(design));
  });
});
