import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CasterCheck, type RayProbe } from '../../../../src/render/shadow/coneCasters';
import { rowWords } from '../../../../src/render/shadow/tileKey';
import { beamRows, setRow } from './shadowRows';

/** A check on two beams straight down from 8 m, with a probe that records its rays. */
function setup(hit: (call: number) => number, maxTests = 8) {
  const rays: { origin: Vector3; direction: Vector3; near: number; far: number }[] = [];
  const probe = vi.fn<RayProbe>((origin, direction, near, far) => {
    rays.push({ origin: origin.clone(), direction: direction.clone(), near, far });
    return hit(rays.length - 1);
  });
  const rows = beamRows(2);
  return { check: new CasterCheck(probe, maxTests), probe, rays, rows, words: rowWords(rows) };
}

describe('CasterCheck', () => {
  it('finds no caster in an empty cone after five rays: the axis and four rim rays that end before the hit', () => {
    const { check, rays, rows, words } = setup(() => Infinity);
    expect(check.has(rows, words, 0, 1)).toBe(false);
    expect(rays).toHaveLength(5);
    const [axis, rim] = rays;
    expect(axis?.origin.toArray()).toEqual([0, 8, 0]);
    expect(axis?.direction.toArray()).toEqual([0, -1, 0]);
    // range 8.5 (lens 0.1 / tan 0.2 behind the origin): the ray stops 2 % short of the end, less the 0.5 to the lens
    expect(axis?.far).toBeCloseTo(0.98 * 8.5 - 0.5, 9);
    expect(rim?.direction.length()).toBeCloseTo(1, 9);
    expect(Math.abs(rim?.direction.z ?? 0) / Math.abs(rim?.direction.y ?? 1)).toBeCloseTo(0.9 * 0.2, 6);
    expect(Math.hypot(rim?.origin.x ?? 0, rim?.origin.z ?? 0)).toBeCloseTo(0.09, 6);
  });

  it('finds a caster when one rim ray is blocked before the end', () => {
    const { check, probe, rows, words } = setup((call) => (call === 3 ? 2.5 : Infinity));
    expect(check.has(rows, words, 0, 1)).toBe(true);
    expect(probe).toHaveBeenCalledTimes(4);
  });

  it('keeps the answer of a row until the row or the scenery epoch changes', () => {
    const { check, probe, rows, words } = setup(() => Infinity);
    check.has(rows, words, 0, 1);
    check.begin();
    expect(check.has(rows, words, 0, 1)).toBe(false);
    expect([probe.mock.calls.length, check.tests]).toEqual([5, 0]);
    check.has(rows, words, 0, 2);
    expect(probe).toHaveBeenCalledTimes(10);
    setRow(rows, 0, { origin: [0, 8.001, 0] });
    check.has(rows, words, 0, 2);
    expect(probe).toHaveBeenCalledTimes(15);
  });

  it('traces no more cones in a frame than the cap, and answers no caster for the rest', () => {
    const { check, probe, rows, words } = setup(() => 1, 1);
    expect(check.has(rows, words, 0, 1)).toBe(true);
    expect(check.has(rows, words, 1, 1)).toBe(false);
    expect(probe).toHaveBeenCalledTimes(1);
    check.begin();
    expect(check.has(rows, words, 1, 1)).toBe(true);
  });
});
