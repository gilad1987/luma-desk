/**
 * Owns the `product` rule of `parseStageDesign`: a known product whose base is the stored type is kept, an unknown
 * id or a base mismatch is dropped without an error (a newer desk's design still loads), a non-string is an error by
 * path. The other fixture fields are owned by parseFixture.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { jsonRoundTrip } from '../../../shared/index.ts';
import { errorsOf, SAMPLE } from './parseSample.ts';

const spot: StageFixture = { id: 1, type: 'spot', role: 'front', trussId: 'front', position: [0, 7, 2], mount: 'hang' };

/** The sample design with its first fixture changed by `patch`. */
function withFixture(patch: Record<string, unknown>): unknown {
  return { ...SAMPLE, fixtures: [{ ...spot, ...patch }, ...SAMPLE.fixtures.slice(1)] };
}

/** The first parsed fixture of `raw`; the test fails on a rejected design. */
function firstFixture(raw: unknown): StageFixture | undefined {
  const result = parseStageDesign(raw);
  expect(result.ok ? [] : result.errors).toEqual([]);
  return result.ok ? result.design.fixtures[0] : undefined;
}

describe('parseStageDesign fixture product', () => {
  it('keeps a known product on a fixture of its base type', () => {
    expect(firstFixture(withFixture({ product: 'robe-esprite' }))).toStrictEqual({ ...spot, product: 'robe-esprite' });
  });

  it('drops an unknown product id without an error and keeps the base type', () => {
    const fixture = firstFixture(withFixture({ product: 'acme-x' }));
    expect([fixture, fixture !== undefined && 'product' in fixture]).toStrictEqual([spot, false]);
  });

  it('drops an empty product id the same way', () => {
    expect(firstFixture(withFixture({ product: '' }))).toStrictEqual(spot);
  });

  it('drops a product whose base is not the stored type', () => {
    const wash: StageFixture = { ...spot, type: 'wash' };
    expect(firstFixture(withFixture({ type: 'wash', product: 'robe-esprite' }))).toStrictEqual(wash);
  });

  it('rejects a product that is not a string, by path', () => {
    expect(errorsOf(withFixture({ product: 5 }))).toEqual(['fixtures[0].product: expected a string, got 5']);
  });

  it('round-trips a design with an Esprite through JSON', () => {
    const esprite: StageFixture = { ...spot, id: 10, product: 'robe-esprite' };
    const design: StageDesign = { ...SAMPLE, fixtures: [...SAMPLE.fixtures, esprite] };
    const result = parseStageDesign(jsonRoundTrip(design));
    expect(result).toStrictEqual({ ok: true, design });
  });
});
