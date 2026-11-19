/**
 * The far rule hides a layer only when nothing says it belongs to the show: one near proxy, or a fixture on the
 * layer, keeps it shown. Both shapes below were hidden by the earlier rule (one far proxy, all outside the file box).
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import type { LayerBox } from '../../../src/mvr/design/layerBoxes.ts';
import { importProxies } from '../../../src/mvr/import/importProxies.ts';
import type { MvrGeometry } from '../../../src/mvr/index.ts';
import { proxyAt, seatRows, wallGrid } from '../../shared/index.ts';

const design = createTemplate('festival');
/** The template without its fixtures, so the 12 m rig mesh alone is the other geometry of the file. */
const bare = { ...design, fixtures: [] };
const rig: LayerBox = {
  layer: 'L1',
  name: 'Layer A',
  box: { min: [-6, 0, -6], max: [6, 9, 6] },
  rig: false,
  drapes: false,
};
const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: rig.box,
  surfaces: [],
  layers: [rig],
  hallLayers: [],
};
const onZ = { layer: 'L9', layerName: 'Layer Z' };
const farLine =
  '20 proxies of layer "Layer Z" are more than 10 m outside the other geometry of the file; hide the layer if it is not part of the show.';
/** The main wall stands 1 m behind the rig, and a side screen of the same layer 14 m off to the side. */
const mainWall = wallGrid(5, 4, 500, onZ).map((p) => proxyAt([p.matrix[12] ?? 0, 7000, p.matrix[14] ?? 0], p));
const sideScreen = wallGrid(5, 4, 500, { ...onZ, symdef: 'S2' }).map((p) =>
  proxyAt([(p.matrix[12] ?? 0) + 20000, 0, p.matrix[14] ?? 0], p),
);
const allFar = wallGrid(5, 4, 500, onZ).map((p) => proxyAt([(p.matrix[12] ?? 0) + 80000, 0, p.matrix[14] ?? 0], p));

describe('importProxies, layers that stay shown', () => {
  it('keeps a main wall 1 m behind the rig shown when a side screen of its layer stands 14 m off', () => {
    const result = importProxies([...mainWall, ...sideScreen], bare, geometry);
    expect(result.hidden).toEqual([]);
    expect(result.geometry.proxies?.filter((p) => p.kind === 'panel')).toHaveLength(40);
    expect(result.warnings.at(-1)?.message).toBe(farLine);
  });

  it('keeps seat rows in front of an open-air stage shown: the near rows say the layer is part of the show', () => {
    const seats = seatRows(40, 20, 550, onZ).map((p) =>
      proxyAt([(p.matrix[12] ?? 0) - 5000, -7000 - (p.matrix[13] ?? 0), p.matrix[14] ?? 0], p),
    );
    const result = importProxies(seats, bare, geometry);
    expect(result.geometry.proxies?.some((p) => p.kind === 'seat')).toBe(true);
    expect(result.warnings.at(-1)?.message).toContain('are more than 10 m outside the other geometry of the file');
    expect(result.hidden).toEqual([]);
  });

  it('keeps a far layer shown when a fixture stands on it, and hides it when none does', () => {
    const fixtures = { 1: { layer: 'L9' } };
    const lit = { ...bare, mvr: { fixtures, layers: [], hiddenLayers: [] } } as unknown as typeof design;
    expect(importProxies(allFar, lit, geometry).hidden).toEqual([]);
    expect(importProxies(allFar, bare, geometry).hidden).toEqual(['L9']);
  });
});
