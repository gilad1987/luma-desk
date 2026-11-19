/**
 * Owns how the move and undo paths carry `product`: a moved fixture, a fixture carried by its truss, a truss props
 * patch and a delete undone through History keep it. Duplicate, mirror and the props patch are owned by
 * productCarry.test.ts; where the fixtures land by fixtureMoves.test.ts and trussOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { moveFixtures } from '../../../../../src/domain/stage/edit/fixtureMoves.ts';
import { History } from '../../../../../src/domain/stage/edit/History.ts';
import { deleteFixtures } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { moveTruss, setTrussProps } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { PIPE, withEsprite } from './sampleDesign.ts';

/** Id and position of every Esprite of `d`. */
function esprites(d: StageDesign | undefined): unknown[] {
  return (d?.fixtures ?? []).filter((f) => f.product === 'robe-esprite').map((f) => [f.id, f.position]);
}

describe('move and undo paths carry the product', () => {
  it('keeps the product on a moved fixture', () => {
    expect(esprites(moveFixtures(withEsprite(), [501], [1, 0, 0]))).toStrictEqual([[501, [-3, 7, 0]]]);
  });

  it('keeps the product on a fixture its truss carries', () => {
    expect(esprites(moveTruss(withEsprite(), PIPE.id, [0, 1, 0]))).toStrictEqual([[501, [-4, 8, 0]]]);
  });

  it('keeps the product when the truss of the fixture gets a new shape', () => {
    const params = { kind: 'straight', a: [-5, 0, 0], b: [6, 0, 0], section: 0.3 } as const;
    const next = setTrussProps(withEsprite(), PIPE.id, { name: 'Long', params });
    expect(esprites(next)).toStrictEqual([[501, [-4, 7, 0]]]);
  });

  it('gives the product back when a delete is undone', () => {
    const d = withEsprite();
    const history = new History(d);
    history.push(deleteFixtures(d, [501]));
    expect([esprites(history.current), esprites(history.undo())]).toStrictEqual([[], [[501, [-4, 7, 0]]]]);
  });
});
