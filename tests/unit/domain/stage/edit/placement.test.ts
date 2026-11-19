/**
 * Owns the placing ops of the property fields and the top view drag: `moveRiser` and `moveTruss` store the moved
 * position on whole millimetres, a truss carries its fixtures, a no-op returns the same design and a stale id is
 * refused. The fixture move is owned by fixtureMoves.test.ts, the truss parent link by trussOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addRiser, moveRiser } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { moveTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import { patchedFixture, PIPE, sampleDesign } from './sampleDesign.ts';

/** -39.528 + (5.473 + 39.528) is 5.472999999999999 in floats; a placed item must store 5.473. */
const FROM_X = -39.528;
const TO_X = 5.473;

/** A drag sends `target - anchor`: -59.9993 + (10.5 + 59.9993) is 10.500000000000007; the truss must store 10.5. */
const DRAG_FROM_X = -59.9993;
const DRAG_TO_X = 10.5;

describe('moveRiser', () => {
  const withRiser = addRiser(sampleDesign(), [FROM_X, 1, 2], [2, 0.4, 2]);
  const id = withRiser.risers[0]?.id ?? '';

  it('moves the riser and stores the typed position exactly', () => {
    const moved = moveRiser(withRiser, id, [TO_X - FROM_X, 0, -0.5]);
    expect([Object.is(moved.risers[0]?.at[0], TO_X), moved.risers[0]?.at.slice(1)]).toEqual([true, [1, 1.5]]);
  });

  it('returns the same design for a zero delta and refuses a stale id or a non-finite delta', () => {
    expect(moveRiser(withRiser, id, [0, 0, 0])).toBe(withRiser);
    expect(() => moveRiser(withRiser, 'gone', [1, 0, 0])).toThrow(/moveRiser: no riser with id gone/);
    expect(() => moveRiser(withRiser, id, [Number.NaN, 0, 0])).toThrow(RangeError);
  });
});

describe('moveTruss on whole millimetres', () => {
  /** The pipe off the millimetre grid, as an imported show holds it, with one fixture 0.3 m off its centre. */
  const offGrid = {
    ...patchedFixture(sampleDesign(), 101, { position: [DRAG_FROM_X + 0.3, 7, 0.0004] }),
    trusses: [{ ...PIPE, transform: { position: [DRAG_FROM_X, 7, 0] as const } }],
  };

  it('stores a dragged target exactly and rounds the fixtures it carries', () => {
    const dragged = moveTruss(offGrid, PIPE.id, [DRAG_TO_X - DRAG_FROM_X, 0, 0]);
    expect([dragged.trusses[0]?.transform.position, dragged.fixtures[0]?.position]).toEqual([
      [DRAG_TO_X, 7, 0],
      [10.8, 7, 0],
    ]);
  });

  it('rounds a sub-millimetre target to the nearest millimetre', () => {
    const moved = moveTruss(sampleDesign(), PIPE.id, [1.2344, 0, -0.0006]);
    expect(moved.trusses[0]?.transform.position).toEqual([1.234, 7, -0.001]);
  });

  it('returns the same design when the delta rounds back to the same place, so no empty undo step is made', () => {
    const design = sampleDesign();
    expect(moveTruss(design, PIPE.id, [0.0002, 0, 0])).toBe(design);
  });
});
