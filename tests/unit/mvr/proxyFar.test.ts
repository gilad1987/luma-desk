/**
 * A proxy grid far from every mesh and fixture is still drawn, as the file places it there, and the summary names its
 * layer so the user can hide it. A file without a mesh has no venue to measure from and reports nothing as far.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import type { LayerBox } from '../../../src/mvr/design/layerBoxes.ts';
import { importProxies } from '../../../src/mvr/import/importProxies.ts';
import type { MvrGeometry } from '../../../src/mvr/index.ts';
import { proxyAt, wallGrid } from '../../shared/index.ts';

const design = createTemplate('festival');
const hall: LayerBox = {
  layer: 'L1',
  name: 'Layer A',
  box: { min: [-20, 0, -20], max: [20, 9, 20] },
  rig: false,
  drapes: false,
};
const bounds = { min: [-20, 0, -20], max: [20, 9, 20] } as const;
const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds,
  surfaces: [],
  layers: [hall],
  hallLayers: [],
};
const near = wallGrid(5, 4, 500);
const far = wallGrid(5, 4, 500, { layer: 'L9', layerName: 'Layer Z' }).map((p) =>
  proxyAt([(p.matrix[12] ?? 0) + 80000, 0, p.matrix[14] ?? 0], p),
);

describe('importProxies', () => {
  it('reports the layer of a proxy grid that lies far outside the other geometry, and still keeps it', () => {
    const result = importProxies([...near, ...far], design, geometry);
    expect(result.geometry.proxies?.filter((p) => p.kind === 'panel')).toHaveLength(40);
    expect(result.warnings.map((w) => w.message)).toEqual([
      '40 LED panels are shown as proxies; their size is inferred from spacing.',
      '20 proxies of layer "Layer Z" are more than 10 m outside the other geometry of the file; hide the layer if it is not part of the show.',
    ]);
  });

  it('reports nothing as far for a file without a mesh, and returns the geometry itself without placements', () => {
    expect(importProxies([...near, ...far], design, { ...geometry, layers: [] }).warnings).toHaveLength(1);
    expect(importProxies([], design, geometry)).toEqual({ geometry, warnings: [] });
  });
});
