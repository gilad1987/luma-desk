/**
 * The audience figures. Every figure of the library, at both levels of detail, must be a closed outward surface with
 * normals, inside its triangle budget, and of human size on the proxy seat: the owner rejected figures that read as
 * primitives, and a figure of the wrong size makes every fixture next to it look wrong.
 */
import { describe, expect, it } from 'vitest';
import { figureGeometry, type Detail } from '../../../../../src/render/venue/audience/figureGeometry.ts';
import { FIGURES, type FigureSpec } from '../../../../../src/render/venue/audience/FigureSpec.ts';
import { SEAT_TOP } from '../../../../../src/render/venue/audience/legs.ts';

type Point = readonly [number, number, number];
const within = (value: number, low: number, high: number): boolean => value >= low && value <= high;

function measure(spec: FigureSpec, detail: Detail) {
  const geometry = figureGeometry(spec, detail);
  const read = (name: string): number[] => Array.from(geometry.getAttribute(name).array);
  const [flat, normals, parts, heads] = [read('position'), read('normal'), read('aPart'), read('aHead')];
  const index = Array.from(geometry.getIndex()?.array ?? []);
  const point = (i: number): Point => [flat[i * 3] ?? 0, flat[i * 3 + 1] ?? 0, flat[i * 3 + 2] ?? 0];
  const points = Array.from({ length: flat.length / 3 }, (_, i) => point(i));
  const edges = new Map<string, number>();
  let volume = 0;
  for (let t = 0; t < index.length; t += 3) {
    const [a = 0, b = 0, c = 0] = index.slice(t, t + 3);
    for (const edge of [`${a}>${b}`, `${b}>${c}`, `${c}>${a}`]) edges.set(edge, (edges.get(edge) ?? 0) + 1);
    const [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] = [point(a), point(b), point(c)];
    volume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  // Closed and outward: every edge is walked once in each direction.
  const open = [...edges.keys()].filter((edge) => {
    const [from, to] = edge.split('>');
    return edges.get(edge) !== 1 || edges.get(`${to}>${from}`) !== 1;
  });
  const span = (axis: 0 | 1 | 2, of: readonly Point[]): number =>
    Math.max(...of.map((p) => p[axis])) - Math.min(...of.map((p) => p[axis]));
  const unit = points.map((_, i) => Math.hypot(normals[i * 3] ?? 0, normals[i * 3 + 1] ?? 0, normals[i * 3 + 2] ?? 0));
  return {
    triangles: index.length / 3,
    open: open.length,
    volume,
    headTop: Math.max(...points.map((p) => p[1])) + SEAT_TOP,
    soles: Math.min(...points.map((p) => p[1])) + SEAT_TOP,
    width: span(0, points),
    normals: [normals.length === flat.length, Math.min(...unit) > 0.99, Math.max(...unit) < 1.01],
    masks: new Set(parts.filter((_, i) => i % 2 === 0)),
    shades: parts.filter((_, i) => i % 2 === 1),
    turning: heads.filter((weight, i) => i % 4 === 3 && weight === 1).length,
  };
}

describe('audience figures', () => {
  it('has bodies in adult ranges over several pose families and hair shapes', () => {
    expect(FIGURES.every((f) => within(f.stature, 1.55, 1.9) && within(f.shoulders, 0.36, 0.5))).toBe(true);
    expect(new Set(FIGURES.map((f) => f.arms)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(FIGURES.map((f) => f.hair)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(FIGURES.map((f) => f.stature)).size).toBeGreaterThanOrEqual(8);
  });

  it.each(FIGURES.map((spec, i) => [i, spec] as const))('figure %i is a closed human-size surface', (_, spec) => {
    const near = measure(spec, 'near');
    const far = measure(spec, 'far');
    expect([within(near.triangles, 250, 660), within(far.triangles, 60, 130)]).toEqual([true, true]);
    for (const figure of [near, far]) {
      expect(figure.open).toBe(0);
      expect(figure.normals).toEqual([true, true, true]);
      // A person holds 45 to 100 litres; the parts overlap at the joints, so the sum of the parts is a little more.
      expect(within(figure.volume, 0.035, 0.12)).toBe(true);
      // the head of a seated adult of 1.55 to 1.90 m on a 0.45 m seat; the body ratios are in `figureProportions`
      expect(within(figure.headTop, 1.25, 1.45)).toBe(true);
      expect(within(figure.soles, -0.01, 0.03)).toBe(true);
      // Narrower than the 0.54 m pitch of a common seat row, so neighbours do not run into each other.
      expect(figure.width).toBeLessThan(0.54);
      expect(figure.turning).toBeGreaterThan(15);
    }
    // The face is shaded skin: eye sockets and mouth are darker than the cheeks, with no texture.
    expect([Math.min(...near.shades) < 0.5, Math.max(...near.shades)]).toEqual([true, 1]);
    expect([0, 1, 3, 4].every((mask) => near.masks.has(mask))).toBe(true);
  });
});
