// @vitest-environment jsdom
/**
 * `GeometryReference` loops and fan-outs: a reference back to a geometry on the current path shows nothing, and the
 * whole walk has a step budget, so k references per level do not make k^8 steps. A pixel bar still counts its pixels.
 */
import { describe, expect, it } from 'vitest';
import { readBeams } from '../../../src/mvr/gdtf/optics/readBeams.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const refs = (target: string, count: number): string =>
  Array.from({ length: count }, (_, index) => `<GeometryReference Name="R${index}" Geometry="${target}"/>`).join('');
const counts = (geometries: string): [string, number][] =>
  readBeams(parseXml(`<Geometries>${geometries}</Geometries>`).documentElement).map((beam) => [beam.root, beam.count]);

describe('readBeams on references', () => {
  it('shows a beam once when its geometry refers to itself', () => {
    expect(counts(`<Geometry Name="A"><Beam Name="B"/>${refs('A', 6)}</Geometry>`)).toEqual([['A', 1]]);
  });

  it('stops a loop between two geometries at the first step back', () => {
    const loop = `<Geometry Name="A">${refs('B', 3)}</Geometry><Geometry Name="B"><Beam Name="L"/>${refs('A', 3)}</Geometry>`;
    expect(counts(loop)).toEqual([
      ['A', 3],
      ['B', 1],
    ]);
  });

  it('ends a fan-out of 10 references per level within the step budget', () => {
    const levels = Array.from({ length: 10 }, (_, level) =>
      level === 9
        ? '<Geometry Name="G9"><Beam Name="L"/></Geometry>'
        : `<Geometry Name="G${level}">${refs(`G${level + 1}`, 10)}</Geometry>`,
    );
    const found = new Map(counts(levels.join('')));
    // the trees within the budget count every showing; the deeper ones stop at the budget, not after 10^8 steps
    expect([5, 6, 7, 8, 9].map((level) => found.get(`G${level}`))).toEqual([10_000, 1000, 100, 10, 1]);
    expect(Math.max(...found.values())).toBeLessThanOrEqual(100_000);
  });

  it('counts the beam of a 512-pixel bar once per pixel', () => {
    expect(
      counts(`<Geometry Name="Bar">${refs('Pixel', 512)}</Geometry><Geometry Name="Pixel"><Beam/></Geometry>`),
    ).toEqual([
      ['Bar', 512],
      ['Pixel', 1],
    ]);
  });
});
