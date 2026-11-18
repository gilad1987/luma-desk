/**
 * Owns the size rules of `parseStageDesign`: every truss section, radius and size, every riser and side screen size
 * must be above zero, an LED wall must have x0 < x1 and y0 < y1, and a ring's chain count is a positive integer. A
 * zero or negative size would draw nothing or turn a shape inside out. Each error names path and value.
 */
import { describe, expect, it } from 'vitest';
import { errorsOf, SAMPLE } from './parseSample.ts';

const ABOVE_ZERO = 'expected a number greater than 0, got';

/** The sample design with the params of truss `index` changed by `patch`. */
function withParams(index: number, patch: Record<string, unknown>): unknown {
  const trusses = SAMPLE.trusses.map((t, i) => (i === index ? { ...t, params: { ...t.params, ...patch } } : t));
  return { ...SAMPLE, trusses };
}

/** The sample design with its LED wall changed by `patch`. */
function withWall(patch: Record<string, unknown>): unknown {
  return { ...SAMPLE, screens: SAMPLE.screens.map((s) => ({ ...s, ...patch })) };
}

const part = { size: [0.6, -0.1, 0.6], at: [0, 0, 0], material: 'dark' };

describe('parseStageDesign sizes', () => {
  it.each<[string, unknown, string[]]>([
    ['a zero straight section', withParams(0, { section: 0 }), [`trusses[0].params.section: ${ABOVE_ZERO} 0`]],
    ['a negative tower section', withParams(3, { section: -0.3 }), [`trusses[3].params.section: ${ABOVE_ZERO} -0.3`]],
    ['a zero circle radius', withParams(1, { radius: 0 }), [`trusses[1].params.radius: ${ABOVE_ZERO} 0`]],
    ['a negative circle section', withParams(1, { section: -1 }), [`trusses[1].params.section: ${ABOVE_ZERO} -1`]],
    ['a zero goalpost width', withParams(2, { width: 0 }), [`trusses[2].params.width: ${ABOVE_ZERO} 0`]],
    ['a negative goalpost height', withParams(2, { height: -6 }), [`trusses[2].params.height: ${ABOVE_ZERO} -6`]],
    ['a zero goalpost section', withParams(2, { section: 0 }), [`trusses[2].params.section: ${ABOVE_ZERO} 0`]],
    ['a flat roof', withParams(4, { size: [16, 0, 10] }), [`trusses[4].params.size[1]: ${ABOVE_ZERO} 0`]],
    [
      'a negative part size',
      withParams(0, { parts: [part] }),
      [`trusses[0].params.parts[0].size[1]: ${ABOVE_ZERO} -0.1`],
    ],
  ])('rejects %s', (_, raw, errors) => {
    expect(errorsOf(raw)).toStrictEqual(errors);
  });

  it('rejects a ring chain count that is not a positive integer', () => {
    for (const count of [0, -2, 2.5]) {
      expect(errorsOf(withParams(1, { chains: { count, phase: 0 } }))).toStrictEqual([
        `trusses[1].params.chains.count: expected a positive integer, got ${count}`,
      ]);
    }
  });

  it('rejects a riser with a size component of zero or less', () => {
    const risers = [{ id: 'drum', at: [0, 1.6, -3], size: [3, -0.4, 0] }];
    expect(errorsOf({ ...SAMPLE, risers })).toStrictEqual([
      `risers[0].size[1]: ${ABOVE_ZERO} -0.4`,
      `risers[0].size[2]: ${ABOVE_ZERO} 0`,
    ]);
  });

  it('rejects a side screen with a width or height of zero or less', () => {
    const sides = [{ at: [-7, 4, -4], yaw: 0.3, width: 0, height: -2 }];
    expect(errorsOf(withWall({ sides }))).toStrictEqual([
      `screens[0].sides[0].width: ${ABOVE_ZERO} 0`,
      `screens[0].sides[0].height: ${ABOVE_ZERO} -2`,
    ]);
  });

  it('rejects an LED wall whose x or y edges are equal or swapped', () => {
    expect(errorsOf(withWall({ x0: 4, x1: 4, y0: 6, y1: 2 }))).toStrictEqual([
      'screens[0].x1: must be greater than x0 4, got 4',
      'screens[0].y1: must be greater than y0 6, got 2',
    ]);
  });

  it('accepts the smallest sizes above zero', () => {
    expect(errorsOf(withParams(1, { radius: 1e-9, section: 1e-9, chains: { count: 1, phase: 0 } }))).toStrictEqual([]);
  });
});
