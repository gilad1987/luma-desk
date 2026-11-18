/**
 * Owns `moveFixtures`: the pixel line moves with its fixture, many fixtures cost one parse, a no-op returns the same
 * design and a bad delta is refused by the parser. Truss moves live in trussOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { moveFixtures } from '../../../../../src/domain/stage/edit/fixtureMoves.ts';
import { setFixtureProps } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { roundToMillimetre } from '../../../../../src/domain/stage/edit/millimetres.ts';
import type { StageDesign, StageFixture } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import { patchedFixture, sampleDesign } from './sampleDesign.ts';

/** The sample design with fixture 301 counting reads of its role, so a test sees how often the parser reads it. */
function countedDesign(): { d: StageDesign; reads: () => number } {
  let reads = 0;
  const counted = (f: StageFixture): StageFixture =>
    Object.defineProperty({ ...f }, 'role', {
      enumerable: true,
      get: () => {
        reads += 1;
        return f.role;
      },
    });
  const d = sampleDesign();
  return { d: { ...d, fixtures: d.fixtures.map((f) => (f.id === 301 ? counted(f) : f)) }, reads: () => reads };
}

const fixtureOf = (d: ReturnType<typeof sampleDesign>, id: number) => d.fixtures.find((f) => f.id === id);

describe('moveFixtures', () => {
  it('moves the pixel strip with the fixture, both stored on whole millimetres (Sultan’s Pool 1201)', () => {
    const pool = createTemplate('sultans-pool');
    const before = fixtureOf(pool, 1201);
    if (!before?.pixel) throw new Error('fixture 1201 of the Sultan’s Pool template has a pixel line');
    const after = fixtureOf(moveFixtures(pool, [1201], [1, 0, -2]), 1201);
    const [x, y, z] = before.pixel.p;
    expect([after?.position, after?.pixel?.p]).toEqual([
      roundToMillimetre([before.position[0] + 1, before.position[1], before.position[2] - 2]),
      roundToMillimetre([x + 1, y, z - 2]),
    ]);
  });

  it('stores a moved position as the typed value, not one ulp off it', () => {
    // -39.528 + (5.473 + 39.528) is 5.472999999999999 in floats
    const at = setFixtureProps(sampleDesign(), 301, { position: [-39.528, 1, 3] });
    const moved = moveFixtures(at, [301], [5.473 + 39.528, 0, 0]);
    expect(Object.is(fixtureOf(moved, 301)?.position[0], 5.473)).toBe(true);
  });

  it('moves many fixtures with one parse: an unmoved fixture is read as often as by a one-fixture edit', () => {
    const one = countedDesign();
    setFixtureProps(one.d, 101, { position: [-2, 7.5, 0] });
    const many = countedDesign();
    const d = moveFixtures(many.d, [101, 102, 201], [0, 0.5, 0]);
    expect([many.reads() > 0, many.reads(), d.fixtures.map((f) => f.position[1])]).toEqual([
      true,
      one.reads(),
      [7.5, 7.5, 3.5, 1],
    ]);
  });

  it('returns the same design for a zero delta or ids that name no fixture', () => {
    const d = sampleDesign();
    expect([moveFixtures(d, [101], [0, 0, 0]) === d, moveFixtures(d, [999], [1, 0, 0]) === d]).toEqual([true, true]);
  });

  it('leaves an off-millimetre fixture as imported on a zero delta, instead of rounding it as a move', () => {
    const imported = patchedFixture(sampleDesign(), 301, { position: [-3.0004, 1, 3] });
    expect(moveFixtures(imported, [301], [0, 0, 0])).toBe(imported);
  });

  it('refuses a bad delta with the errors of every moved fixture at once, from one parse', () => {
    expect(() => moveFixtures(sampleDesign(), [101, 102], [Number.NaN, 0, 0])).toThrow(
      /^moveFixtures: fixtures\[0\]\.position\[0\].*; fixtures\[1\]\.position\[0\]/,
    );
  });
});
