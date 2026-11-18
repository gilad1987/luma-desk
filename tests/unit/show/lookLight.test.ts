/** The area rule of the first look: what key and tone need follows the area, the throw, the zoom and the type. */
import { describe, expect, it } from 'vitest';
import { groupLevel } from '../../../src/show/mvrLook/lookLevels';
import { areaBudget, landedOutput, luminanceOf, poolArea } from '../../../src/show/mvrLook/lookLight';

/** The band area of the synthetic deck: 64 m2 at 3 units per m2 needs 192 in all. */
const NEED = { lux: 3, area: 64, minLevel: 20 };
const washes = (count: number, output = 0.9): number[] => Array.from({ length: count }, () => output);
const levelOf = (count: number, output?: number) => groupLevel(areaBudget(NEED, washes(count, output)), count);

describe('poolArea, landedOutput and luminanceOf', () => {
  it('grows the pool with the square of the throw and of tan(zoom / 2)', () => {
    expect(poolArea(10, 60)).toBeCloseTo(104.72, 1);
    expect(poolArea(20, 60) / poolArea(10, 60)).toBeCloseTo(4, 9);
    expect(poolArea(-3, 60)).toBe(0);
  });

  it('lands all of the type power while the pool fits the area, then only the share area / pool', () => {
    expect(landedOutput(0.9, 20, 50)).toBe(0.9);
    expect(landedOutput(1, 200, 50)).toBe(0.25);
  });

  it('reads deep blue as about a seventh of white', () => {
    expect(luminanceOf({ r: 100, g: 100, b: 100 })).toBeCloseTo(1, 9);
    expect(luminanceOf({ r: 0, g: 10, b: 100 })).toBeCloseTo(0.1437, 4);
  });
});

describe('areaBudget', () => {
  it('runs every unit at 100 when the outputs sum to zero or are not numbers', () => {
    expect(groupLevel(areaBudget(NEED, [0, 0, 0]), 3)).toEqual({ level: 100, lit: 3 });
    expect(groupLevel(areaBudget(NEED, [NaN, NaN]), 2)).toEqual({ level: 100, lit: 2 });
    expect(groupLevel(areaBudget(NEED, [NaN, 0, Infinity]), 3)).toEqual({ level: 100, lit: 3 });
  });

  it('runs a small rig at full: one wash cannot give 192, so it is not dim', () => {
    expect(levelOf(1)).toEqual({ level: 100, lit: 1 });
    expect(levelOf(2)).toEqual({ level: 100, lit: 2 });
  });

  it('gives all units the level need / output: ten washes at 21', () => {
    expect(levelOf(10)).toEqual({ level: 21, lit: 10 });
  });

  it('lights only as many units at the lowest level as the area needs: 11 of 50, 11 of 500, no white-out', () => {
    expect(levelOf(50)).toEqual({ level: 20, lit: 11 });
    expect(levelOf(500)).toEqual({ level: 20, lit: 11 });
  });

  it('asks four times the level of units whose pool is four times the area (twice the throw)', () => {
    expect(levelOf(10, 0.9 / 4)).toEqual({ level: 85, lit: 10 });
  });

  it('doubles the level for twice the area and lights every unit of an "all" group', () => {
    const twice = areaBudget({ ...NEED, area: 128 }, washes(10));
    expect(groupLevel(twice, 10)).toEqual({ level: 43, lit: 10 });
    expect(groupLevel(areaBudget({ ...NEED, all: true }, washes(50)), 50)).toEqual({ level: 20, lit: 50 });
  });

  it('runs units without output at full and never divides by zero', () => {
    expect(groupLevel(areaBudget(NEED, [0, NaN]), 2)).toEqual({ level: 100, lit: 2 });
    expect(areaBudget(NEED, []).budget).toBe(0);
  });
});
