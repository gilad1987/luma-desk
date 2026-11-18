/**
 * A proxy layer whose every proxy lies far from every mesh and fixture, with no mesh and no fixture on it, is kept in
 * the data and starts hidden, and the summary says so. A layer with one near proxy stays shown and the summary names
 * it. A file without a mesh has nothing to measure from and reports nothing as far.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import type { LayerBox } from '../../../src/mvr/design/layerBoxes.ts';
import { withHiddenLayers } from '../../../src/mvr/import/farLine.ts';
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

const parkedLine =
  '20 LED panels on layer "Layer Z" lie more than 10 m outside the other geometry of the file; the layer is hidden (turn it on in the layer list).';
const farLine =
  '20 proxies of layer "Layer Z" are more than 10 m outside the other geometry of the file; hide the layer if it is not part of the show.';

describe('importProxies', () => {
  it('hides the layer of a proxy grid that lies outside the venue, says so, and still keeps the proxies', () => {
    const result = importProxies([...near, ...far], design, geometry);
    expect(result.geometry.proxies?.filter((p) => p.kind === 'panel')).toHaveLength(40);
    expect(result.hidden).toEqual(['L9']);
    expect(result.warnings.map((w) => w.message)).toEqual([
      '40 LED panels are shown as proxies; their size is inferred from spacing.',
      parkedLine,
    ]);
  });

  it("keeps the layer shown for a file that brings the user's own layer choice", () => {
    const result = importProxies([...near, ...far], design, geometry, false);
    expect([result.hidden, result.warnings[1]?.message]).toEqual([[], farLine]);
  });

  it('keeps a layer shown that only runs past the venue, or that also holds meshes', () => {
    const mixed = [...far, ...wallGrid(5, 4, 500, { layer: 'L9', layerName: 'Layer Z' })];
    expect(importProxies(mixed, design, geometry).hidden).toEqual([]);
    const withMesh = { ...geometry, layers: [hall, { ...hall, layer: 'L9', name: 'Layer Z' }] };
    expect(importProxies([...near, ...far], design, withMesh).hidden).toEqual([]);
  });

  it('reports nothing as far for a file without a mesh, and returns the geometry itself without placements', () => {
    const noMesh = importProxies([...near, ...far], design, { ...geometry, layers: [] });
    expect([noMesh.warnings.length, noMesh.hidden]).toEqual([1, []]);
    expect(importProxies([], design, geometry)).toEqual({ geometry, warnings: [], hidden: [] });
  });
});

describe('withHiddenLayers', () => {
  it('adds the layers to those the design hides, once each, and leaves a design without MVR facts alone', () => {
    expect(withHiddenLayers(design, ['L9'])).toBe(design);
    const mvr = { ...design, mvr: { hiddenLayers: ['L1'] } } as unknown as typeof design;
    expect(withHiddenLayers(mvr, ['L9', 'L1']).mvr?.hiddenLayers).toEqual(['L1', 'L9']);
    expect(withHiddenLayers(mvr, [])).toBe(mvr);
  });
});
