/**
 * Owns the rule that a fixture id is never given out twice in a design's life: after the highest fixtures are deleted
 * (as fixtures, with their truss, or as the LED wall screen), a new batch still starts above them, and a saved design
 * keeps that mark. Cues and groups point at fixture ids, so a reused id would drive a different light. A design saved
 * before the mark existed derives it from its highest id.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss, addFloorRow } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { nextIdBlock } from '../../../../../src/domain/stage/edit/ids.ts';
import { deleteFixtures, deleteTruss } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

const ROW = { type: 'par', count: 2, from: [-2, 1, 3], to: [2, 1, 3] } as const;

/** The design after a JSON save and load, as the show file stores it. */
function reloaded(d: StageDesign): StageDesign {
  const parsed = parseStageDesign(JSON.parse(JSON.stringify(d)));
  if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
  return parsed.design;
}

describe('fixture ids after a delete', () => {
  it('gives a new batch no id of a deleted fixture', () => {
    const added = addFloorRow(deleteFixtures(sampleDesign(), [301]), ROW);
    expect(added.fixtures.slice(-2).map((f) => f.id)).toEqual([401, 402]);
  });

  it('keeps the ids of a removed LED wall', () => {
    const walled = setLedWall(sampleDesign(), { width: 8, height: 4 });
    expect(nextIdBlock(setLedWall(walled, null))).toBe(501);
  });

  it('keeps the ids of a deleted truss that held the highest fixtures', () => {
    const onPipe = addFixturesOnTruss(sampleDesign(), { trussId: 'pipe-1', type: 'par', count: 2 });
    const top = onPipe.fixtures.filter((f) => f.id > 400);
    expect(top.map((f) => [f.id, f.trussId])).toEqual([
      [401, 'pipe-1'],
      [402, 'pipe-1'],
    ]);
    const deleted = deleteTruss(onPipe, 'pipe-1');
    expect(Math.max(...deleted.fixtures.map((f) => f.id))).toBeLessThan(401);
    expect(nextIdBlock(deleted)).toBe(501);
  });

  it('keeps the mark through a save and load', () => {
    expect(nextIdBlock(reloaded(deleteFixtures(sampleDesign(), [301])))).toBe(401);
  });

  it('derives the mark of a design saved without it from its highest id', () => {
    expect(nextIdBlock(reloaded(sampleDesign()))).toBe(401);
    expect(reloaded(sampleDesign())).not.toHaveProperty('nextFixtureId');
  });
});
