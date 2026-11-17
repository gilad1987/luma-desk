/**
 * Owns the fixture rules of `parseStageDesign`: id, type, role, mount, truss link, position, the optional rotation
 * (normalized on read, zero length rejected), and that there is no fixture-count cap. Each error names path and value.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { errorsOf, SAMPLE } from './parseSample.ts';

const spot: StageFixture = { id: 1, type: 'spot', role: 'front', trussId: 'front', position: [0, 7, 2], mount: 'hang' };

/** The sample design with its first fixture changed by `patch`. */
function withFixture(patch: Record<string, unknown>): unknown {
  return { ...SAMPLE, fixtures: [{ ...spot, ...patch }, ...SAMPLE.fixtures.slice(1)] };
}

describe('parseStageDesign fixtures', () => {
  it('rejects ids that are not positive integers', () => {
    expect(errorsOf(withFixture({ id: 0 }))).toEqual(['fixtures[0].id: expected a positive integer, got 0']);
    expect(errorsOf(withFixture({ id: 1.5 }))).toEqual(['fixtures[0].id: expected a positive integer, got 1.5']);
    expect(errorsOf(withFixture({ id: '3' }))).toEqual(['fixtures[0].id: expected a positive integer, got "3"']);
  });

  it('rejects a duplicate id', () => {
    expect(errorsOf(withFixture({ id: 2 }))).toEqual(['fixtures[1].id: duplicate id 2']);
  });

  it('rejects an unknown type, role or mount', () => {
    expect(errorsOf(withFixture({ type: 'laser' }))).toEqual(['fixtures[0].type: unknown type "laser"']);
    expect(errorsOf(withFixture({ type: 'toString' }))).toEqual(['fixtures[0].type: unknown type "toString"']);
    expect(errorsOf(withFixture({ role: 'x' }))).toEqual(['fixtures[0].role: unknown role "x"']);
    expect(errorsOf(withFixture({ mount: 'ceiling' }))).toEqual(['fixtures[0].mount: unknown mount "ceiling"']);
  });

  it('accepts a null trussId and rejects a truss that is not in the design', () => {
    expect(errorsOf(withFixture({ trussId: null }))).toEqual([]);
    expect(errorsOf(withFixture({ trussId: 'nope' }))).toEqual(['fixtures[0].trussId: unknown truss "nope"']);
    expect(errorsOf(withFixture({ trussId: undefined }))).toEqual(['fixtures[0].trussId: unknown truss undefined']);
  });

  it('rejects positions that are not 3 finite numbers', () => {
    expect(errorsOf(withFixture({ position: [0, Infinity, 0] }))).toEqual([
      'fixtures[0].position[1]: expected a finite number, got Infinity',
    ]);
    expect(errorsOf(withFixture({ position: { x: 0 } }))).toEqual([
      'fixtures[0].position: expected 3 numbers, got an object',
    ]);
  });

  it('normalizes a rotation on read', () => {
    const parsed = parseStageDesign(withFixture({ rotation: [0, 0, 0, 2] }));
    expect(parsed.ok && parsed.design.fixtures[0]?.rotation).toEqual([0, 0, 0, 1]);
    const tilted = parseStageDesign(withFixture({ rotation: [3, 0, 4, 0] }));
    expect(tilted.ok && tilted.design.fixtures[0]?.rotation).toEqual([0.6, 0, 0.8, 0]);
  });

  it('rejects a zero-length or malformed rotation', () => {
    expect(errorsOf(withFixture({ rotation: [0, 0, 0, 1e-7] }))).toEqual([
      'fixtures[0].rotation: zero-length quaternion [0, 0, 0, 1e-7]',
    ]);
    expect(errorsOf(withFixture({ rotation: [0, 0, 1] }))).toEqual([
      'fixtures[0].rotation: expected 4 numbers, got an array of 3',
    ]);
    expect(errorsOf(withFixture({ rotation: null }))).toEqual(['fixtures[0].rotation: expected 4 numbers, got null']);
  });

  it('rejects bad fixed and pixel fields by path', () => {
    expect(errorsOf(withFixture({ fixed: { pan: 0 } }))).toEqual([
      'fixtures[0].fixed.tilt: expected a finite number, got undefined',
    ]);
    expect(errorsOf(withFixture({ pixel: { p: [0, 0, 0], tan: [1, 0, 0], len: '1' } }))).toEqual([
      'fixtures[0].pixel.len: expected a finite number, got "1"',
    ]);
  });

  it('has no fixture-count cap', () => {
    const many = Array.from({ length: 1200 }, (_, i) => ({ ...spot, id: i + 100, trussId: null }));
    const parsed = parseStageDesign({ ...SAMPLE, fixtures: [...SAMPLE.fixtures, ...many] });
    expect(parsed.ok && parsed.design.fixtures).toHaveLength(SAMPLE.fixtures.length + 1200);
  });
});
