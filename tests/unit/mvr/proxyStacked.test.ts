/**
 * CAD files stack copies of an empty Symdef at one point. Each distinct place is classified once; a copy stacked on
 * another of the same Symdef and layer is `unknown` with the reason `stacked`, so it is counted and never drawn on
 * top of the first. Thousands of stacked copies must not make the classifier quadratic.
 */
import { describe, expect, it } from 'vitest';
import { classifyProxies } from '../../../src/mvr/scene/proxyClassify.ts';
import { proxyWarnings } from '../../../src/mvr/scene/proxyWarnings.ts';
import { proxyAt, seatRows } from '../../shared/index.ts';

const STACKED = 8000;

describe('stacked empty-Symdef placements', () => {
  it(`classifies ${STACKED} copies at one point beside a row in under 100 ms; the copies are unknown`, () => {
    const stacked = Array.from({ length: STACKED }, () => proxyAt([0, 0, 0]));
    const row = Array.from({ length: 50 }, (_, i) => proxyAt([(i + 1) * 500, 0, 0]));
    const start = performance.now();
    const proxies = classifyProxies([...stacked, ...row]);
    expect(performance.now() - start).toBeLessThan(100);
    const copies = proxies.slice(1, STACKED);
    expect(copies.every((p) => p.kind === 'unknown' && p.reason === 'stacked' && !p.frame)).toBe(true);
    const counts = proxyWarnings(proxies).map((w) => Number(/^[\d,]+/.exec(w.message)?.[0].replace(',', '')));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(STACKED + row.length);
  });

  it('classifies the distinct places of a grid with a few exact copies as without the copies', () => {
    const grid = seatRows(10, 4, 550);
    const copies = [grid[3], grid[17], grid[17]].flatMap((p) => (p ? [p] : []));
    const proxies = classifyProxies([...grid, ...copies]);
    expect(proxies.slice(0, grid.length)).toEqual(classifyProxies(grid));
    expect(proxies.slice(grid.length).map((p) => [p.kind, p.reason, p.frame])).toEqual([
      ['unknown', 'stacked', undefined],
      ['unknown', 'stacked', undefined],
      ['unknown', 'stacked', undefined],
    ]);
    expect(proxyWarnings(proxies).map((w) => w.message)).toEqual([
      '40 seats are shown as proxies; their size is inferred from spacing.',
      '3 objects of 1 symbol have no geometry in the file and are not shown.',
    ]);
  });

  it('keeps copies at one point apart when they are of another Symdef or layer', () => {
    const one = [proxyAt([0, 0, 0]), proxyAt([0, 0, 0], { symdef: 'Other' }), proxyAt([0, 0, 0], { layer: 'L9' })];
    expect(classifyProxies(one).map((p) => p.reason)).toEqual([undefined, undefined, undefined]);
  });
});
