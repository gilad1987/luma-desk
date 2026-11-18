/**
 * Owns the id and link rules of `parseStageDesign` across lists: duplicate screen, riser and fixture ids, a screen
 * that names a fixture which failed on its own (one error, not two), and quaternions kept bit for bit when they are
 * already unit, so a saved design loads back exactly.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import { errorsOf, SAMPLE } from './parseSample.ts';

const [wall] = SAMPLE.screens;
const [riser] = SAMPLE.risers;
const [first] = SAMPLE.fixtures;

describe('parseStageDesign ids', () => {
  it('rejects a second screen or riser with the same id', () => {
    expect(errorsOf({ ...SAMPLE, screens: [wall, wall] })).toStrictEqual([
      'screens[1].id: duplicate id "wall"',
      'screens[1].fixtureId: 9 already drives the LED wall "wall"',
    ]);
    expect(errorsOf({ ...SAMPLE, risers: [riser, riser] })).toStrictEqual(['risers[1].id: duplicate id "drum"']);
  });

  it('reports a duplicate fixture id first, also when another field of that fixture is bad', () => {
    const copy = { ...first, type: 'laser' };
    expect(errorsOf({ ...SAMPLE, fixtures: [...SAMPLE.fixtures, copy] })).toStrictEqual([
      'fixtures[5].id: duplicate id 1',
      'fixtures[5].type: unknown type "laser"',
    ]);
  });

  it('gives a screen whose fixture failed on another field no second error', () => {
    const fixtures = SAMPLE.fixtures.map((f) => (f.type === 'screen' ? { ...f, position: null } : f));
    expect(errorsOf({ ...SAMPLE, fixtures })).toStrictEqual(['fixtures[4].position: expected 3 numbers, got null']);
  });

  it('still rejects a screen whose fixture parsed but is not a screen', () => {
    const fixtures = SAMPLE.fixtures.map((f) => (f.type === 'screen' ? { ...f, type: 'wash' } : f));
    expect(errorsOf({ ...SAMPLE, fixtures })).toStrictEqual([
      'screens[0].fixtureId: 9 is not a fixture of type "screen"',
    ]);
  });

  it('rejects a second LED wall that names the screen fixture of the first', () => {
    expect(errorsOf({ ...SAMPLE, screens: [wall, { ...wall, id: 'side' }] })).toStrictEqual([
      'screens[1].fixtureId: 9 already drives the LED wall "wall"',
    ]);
  });
});

describe('parseStageDesign quaternions', () => {
  const unit = [0.1, -0.2, 0.3, Math.sqrt(1 - 0.14)];
  const rotationOf = (rotation: readonly number[]): readonly number[] | undefined => {
    const parsed = parseStageDesign({ ...SAMPLE, fixtures: [{ ...first, rotation }, ...SAMPLE.fixtures.slice(1)] });
    return parsed.ok ? parsed.design.fixtures[0]?.rotation : undefined;
  };

  it('keeps a quaternion within 1e-12 of unit length exactly as stored', () => {
    const nearUnit = unit.map((v) => v * (1 + 1e-13));
    const off = Math.abs(Math.hypot(...nearUnit) - 1);
    expect([off > 0, off <= 1e-12]).toStrictEqual([true, true]);
    expect(rotationOf(nearUnit)).toStrictEqual(nearUnit);
  });

  it('normalizes a quaternion that is further from unit length', () => {
    const long = unit.map((v) => v * (1 + 1e-9));
    const read = rotationOf(long) ?? [];
    expect(read).not.toStrictEqual(long);
    expect(Math.abs(Math.hypot(...read) - 1)).toBeLessThan(1e-15);
  });
});
