/**
 * Owns the lane shift of `addFixturesOnTruss` on the built-in stage, whose rows hang lower than a builder batch: a
 * new batch on a hung truss must move off them, not hang inside them. The lane rule itself is owned by
 * `addFixtures.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import type { StageFixture } from '../../../../../src/domain/stage/StageDesign.ts';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign.ts';

/** Bodies closer than this (metres) overlap; a lane is 0.4 m. */
const BODY_M = 0.35;

const distance = (a: StageFixture, b: StageFixture): number =>
  Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);

/** The trusses of the built-in stage that hang fixtures (towers stand theirs beside the column). */
const hungTrusses = BUILT_IN_DESIGN.trusses.filter(
  (t) => t.params.kind !== 'tower' && BUILT_IN_DESIGN.fixtures.some((f) => f.trussId === t.id),
);

describe('addFixturesOnTruss on the built-in stage', () => {
  it.each(hungTrusses.map((t) => t.id))('moves a batch on %s off the built-in row', (trussId) => {
    const before = BUILT_IN_DESIGN.fixtures;
    const count = before.filter((f) => f.trussId === trussId).length;
    const added = addFixturesOnTruss(BUILT_IN_DESIGN, { trussId, type: 'beam', count }).fixtures.slice(before.length);
    const closest = Math.min(...added.flatMap((a) => before.map((b) => distance(a, b))));
    expect(closest).toBeGreaterThan(BODY_M);
  });
});
