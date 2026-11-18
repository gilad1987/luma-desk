/**
 * Owns the change side of the property patches: a patch that differs in one key, nested or missing, gives a new
 * design. The no-change side is owned by noOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { setFixtureProps } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setTrussProps } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import type { TrussParams } from '../../../../../src/domain/stage/trussTypes.ts';
import { PIPE, sampleDesign } from './sampleDesign.ts';

const STRAIGHT = { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.3 } as const satisfies TrussParams;

/** The sample with its pipe carrying one chain hoist point. */
const withChains = (): StageDesign => {
  const d = sampleDesign();
  const pipe = { ...PIPE, params: { ...STRAIGHT, chains: [[-5, 0, 0]] } } as const;
  return { ...d, trusses: d.trusses.map((t) => (t.id === PIPE.id ? pipe : t)) };
};

describe('property patches that change a value', () => {
  it('setTrussProps with only a new section gives a new design with the new params', () => {
    const d = sampleDesign();
    const next = setTrussProps(d, PIPE.id, { params: { ...STRAIGHT, section: 0.5 } });
    expect(next).not.toBe(d);
    expect(next.trusses.find((t) => t.id === PIPE.id)?.params).toEqual({ ...STRAIGHT, section: 0.5 });
  });

  it('setFixtureProps with only a new position gives a new design with the fixture moved', () => {
    const d = sampleDesign();
    const next = setFixtureProps(d, 101, { position: [-2, 7, 1] });
    expect(next).not.toBe(d);
    expect(next.fixtures.find((f) => f.id === 101)?.position).toEqual([-2, 7, 1]);
  });

  it('setTrussProps with params that leave out the chains a truss has is not kept (key count)', () => {
    const d = withChains();
    const next = setTrussProps(d, PIPE.id, { params: STRAIGHT });
    expect(next).not.toBe(d);
    expect(next.trusses.find((t) => t.id === PIPE.id)?.params).toEqual(STRAIGHT);
  });
});
