/**
 * What an empty-Symdef placement is taken to be: a name word decides first, then the spacing of the placements of
 * one Symdef on one layer. Every count is kept, and what cannot be told is `unknown`, never a guess.
 */
import { describe, expect, it } from 'vitest';
import { classifyProxies } from '../../../src/mvr/scene/proxyClassify.ts';
import { proxyWarnings, seatProxies } from '../../../src/mvr/scene/proxyWarnings.ts';
import { floorGrid, proxyAt, seatRows, wallGrid } from '../../shared/index.ts';

const kinds = (proxies: readonly { kind: string }[]): Record<string, number> =>
  proxies.reduce<Record<string, number>>((n, { kind }) => ({ ...n, [kind]: (n[kind] ?? 0) + 1 }), {});
const round = (values: Iterable<number>): number[] => [...values].map((v) => Math.round(v * 1000) / 1000 + 0);

describe('classifyProxies', () => {
  it('reads an unnamed standing square grid as panels of the measured pitch, in the grid plane', () => {
    const proxies = classifyProxies(wallGrid(5, 4, 500));
    expect(kinds(proxies)).toEqual({ panel: 20 });
    expect(proxies[0]).toMatchObject({ inferred: true, evidence: 'spacing', pitch: 500 });
    const frame = proxies[7]?.frame ?? new Float64Array(16);
    expect(round(frame.slice(4, 7))).toEqual([0, 0, 1]);
    expect(Math.abs(frame[9] ?? 0)).toBeCloseTo(1);
    expect(round(frame.slice(12, 15))).toEqual([1000, 0, 1500]);
  });

  it('reads unnamed level rows as seats that face the stage centre', () => {
    const proxies = classifyProxies(seatRows(8, 3, 540), [2000, -10000, 0]);
    expect(kinds(proxies)).toEqual({ seat: 24 });
    expect(proxies[0]).toMatchObject({ inferred: true, evidence: 'spacing', pitch: 540 });
    const seats = seatProxies(proxies);
    expect(seats).toHaveLength(24);
    expect(seats[9]).toEqual({ position: [540, 950, 150], facing: [0, -1, 0], layer: 'L1' });
    expect(round(seatProxies(classifyProxies(seatRows(8, 3, 540), [2000, 10000, 0]))[9]?.facing ?? [])).toEqual([
      0, 1, 0,
    ]);
  });

  it('leaves a level square grid, a spacing outside the limits and a small group unknown', () => {
    expect(kinds(classifyProxies(floorGrid(5, 600)))).toEqual({ unknown: 25 });
    expect(kinds(classifyProxies(wallGrid(5, 4, 3000)))).toEqual({ unknown: 20 });
    expect(kinds(classifyProxies(seatRows(3, 1, 540)))).toEqual({ unknown: 3 });
    expect(classifyProxies([proxyAt([0, 0, 0], { symdefName: 'Chair' })])[0]).toMatchObject({ kind: 'unknown' });
  });

  it('lets a name decide, the Symdef before the layer, in English and Hebrew', () => {
    const named = { symdefName: 'Stacking Chair', layerName: 'LED wall' };
    expect(kinds(classifyProxies(seatRows(3, 1, 540, named)))).toEqual({ seat: 3 });
    expect(kinds(classifyProxies(seatRows(3, 1, 540, { symdefName: 'כיסא אולם' })))).toEqual({ seat: 3 });
    expect(classifyProxies(wallGrid(2, 2, 500, { name: 'Tile 7' }))[0]).toMatchObject({
      kind: 'panel',
      evidence: 'name',
    });
    expect(kinds(classifyProxies(seatRows(4, 1, 500, { layerName: 'LED Screen' })))).toEqual({ unknown: 4 });
  });

  it('groups by Symdef and layer, keeps the order and reports counts that sum to the total', () => {
    const wall = wallGrid(5, 4, 500, { symdef: 'S1' });
    const rows = seatRows(8, 3, 540, { symdef: 'S2', layer: 'L2' });
    const roof = [...floorGrid(3, 2000, { symdef: 'S3' }), proxyAt([9000, 9000, 9000], { symdef: 'S4' })];
    const mixed = [...roof, ...wall, ...rows];
    const proxies = classifyProxies(mixed, [0, -5000, 0]);
    expect(proxies.map((p) => p.matrix)).toEqual(mixed.map((p) => p.matrix));
    expect(kinds(proxies)).toEqual({ unknown: 10, panel: 20, seat: 24 });
    expect(proxyWarnings(proxies).map((w) => w.message)).toEqual([
      '20 LED panels and 24 seats are shown as proxies; their size is inferred from spacing.',
      '10 objects of 2 symbols have no geometry in the file and are not shown.',
    ]);
    expect(proxyWarnings(classifyProxies([proxyAt([0, 0, 0])])).map((w) => w.message)).toEqual([
      '1 object of 1 symbol has no geometry in the file and is not shown.',
    ]);
    expect(proxyWarnings(classifyProxies(wallGrid(40, 30, 500)))[0]?.message).toMatch(/^1,200 LED panels are shown/);
  });
});
