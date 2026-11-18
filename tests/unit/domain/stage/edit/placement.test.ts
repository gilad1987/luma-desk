/**
 * Owns the placing ops of the property fields: `moveRiser` and `placeTruss` store the typed position on whole
 * millimetres, a truss carries its fixtures, a no-op returns the same design and a stale id is refused. The fixture
 * move is owned by fixtureMoves.test.ts, the truss delta move by trussOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addRiser, moveRiser } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { moveTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import { placeTruss } from '../../../../../src/domain/stage/edit/trussPlace.ts';
import { sampleDesign } from './sampleDesign.ts';

/** -39.528 + (5.473 + 39.528) is 5.472999999999999 in floats; a placed item must store 5.473. */
const FROM_X = -39.528;
const TO_X = 5.473;

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

describe('placeTruss', () => {
  const start = moveTruss(sampleDesign(), 'pipe-1', [FROM_X, 0, 0]);

  it('puts the truss exactly on the target and moves its fixtures by the same delta', () => {
    const placed = placeTruss(start, 'pipe-1', [TO_X, 7, 0]);
    const delta = TO_X - FROM_X;
    expect([
      Object.is(placed.trusses[0]?.transform.position[0], TO_X),
      placed.fixtures.slice(0, 2).map((f) => f.position[0]),
    ]).toEqual([
      true,
      moveTruss(start, 'pipe-1', [delta, 0, 0])
        .fixtures.slice(0, 2)
        .map((f) => f.position[0]),
    ]);
  });

  it('returns the same design for the current position and refuses a stale id or a non-finite target', () => {
    expect(placeTruss(start, 'pipe-1', [FROM_X, 7, 0])).toBe(start);
    expect(() => placeTruss(start, 'gone', [0, 0, 0])).toThrow(/placeTruss: no truss with id gone/);
    expect(() => placeTruss(start, 'pipe-1', [Number.NaN, 7, 0])).toThrow(RangeError);
  });
});
