/**
 * QA5: the Reader builds the error path from (parent, key, parent path), so an error deep in a list item still names
 * the full path and the bad value. Catches a reader that drops a path segment or a list index. Flat paths are owned
 * by the parse*.test.ts files; the message words by valueRules.
 */
import { describe, expect, it } from 'vitest';
import type { SideScreen } from '../../../../../src/domain/stage/StageDesign.ts';
import { errorsOf, SAMPLE } from '../parseSample.ts';

const [front, ring, ...otherTrusses] = SAMPLE.trusses;
const [spot, wash, par, bar, ...otherFixtures] = SAMPLE.fixtures;
const [wall] = SAMPLE.screens;
const side: SideScreen = { at: [7, 4, -4], yaw: -0.3, width: 3, height: 2 };

/** The sample with the pixel strip of fixtures[3] changed by `pixel`. */
const withPixel = (pixel: Record<string, unknown>): unknown => ({
  ...SAMPLE,
  fixtures: [spot, wash, par, { ...bar, pixel: { ...bar?.pixel, ...pixel } }, ...otherFixtures],
});

/** The sample with the ring chains of trusses[1] changed by `chains`. */
const withRingChains = (chains: Record<string, unknown>): unknown => ({
  ...SAMPLE,
  trusses: [front, { ...ring, params: { kind: 'circle', radius: 4, section: 0.3, chains } }, ...otherTrusses],
});

/** The sample with a second side screen, changed by `patch`, on screens[0]. */
const withSecondSide = (patch: Record<string, unknown>): unknown => ({
  ...SAMPLE,
  screens: [{ ...wall, sides: [...(wall?.sides ?? []), { ...side, ...patch }] }],
});

describe('QA5 parseStageDesign error paths in nested items', () => {
  it('names fixtures[3].pixel.tan with its value, and the bad item by its own index', () => {
    expect(errorsOf(withPixel({ tan: [1, 0] }))).toEqual([
      'fixtures[3].pixel.tan: expected 3 numbers, got an array of 2',
    ]);
    expect(errorsOf(withPixel({ tan: [1, 'x', 0] }))).toEqual([
      'fixtures[3].pixel.tan[1]: expected a finite number, got "x"',
    ]);
  });

  it('names trusses[1].params.chains.count with its value', () => {
    expect(errorsOf(withRingChains({ count: 2.5, phase: 0 }))).toEqual([
      'trusses[1].params.chains.count: expected a positive integer, got 2.5',
    ]);
    expect(errorsOf(withRingChains({ phase: 0 }))).toEqual([
      'trusses[1].params.chains.count: expected a positive integer, got undefined',
    ]);
  });

  it('names screens[0].sides[1].width with its value', () => {
    expect(errorsOf(withSecondSide({ width: 0 }))).toEqual([
      'screens[0].sides[1].width: expected a number greater than 0, got 0',
    ]);
    expect(errorsOf(withSecondSide({ width: '3' }))).toEqual([
      'screens[0].sides[1].width: expected a number greater than 0, got "3"',
    ]);
  });

  it('reports every nested error of one design, each with its own path', () => {
    const fixtures = [spot, wash, par, { ...bar, pixel: { ...bar?.pixel, len: null } }, ...otherFixtures];
    const screens = [{ ...wall, sides: [...(wall?.sides ?? []), { ...side, width: -1, at: [0, 0] }] }];
    expect(errorsOf({ ...SAMPLE, fixtures, screens })).toEqual([
      'fixtures[3].pixel.len: expected a finite number, got null',
      'screens[0].sides[1].at: expected 3 numbers, got an array of 2',
      'screens[0].sides[1].width: expected a number greater than 0, got -1',
    ]);
  });
});
