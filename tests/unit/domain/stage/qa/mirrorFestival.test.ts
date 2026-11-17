/**
 * QA5: mirror on the festival template after the right side was deleted. The copies must link to the right-side
 * trusses (the twins that still stand, or new mirror trusses), never to the left ones, so moving a left truss leaves
 * the right side alone. Catches a copy that keeps its source's `trussId`. Hand-made twin cases are owned by
 * mirrorTwins.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { deleteFixtures, deleteTruss } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import { moveTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';

const festival = createTemplate('festival');
const isRight = (x: number): boolean => x > 0.01;
const rightIds = festival.fixtures.filter((f) => isRight(f.position[0])).map((f) => f.id);
/** The 4 copies of each left tower's washes, 0.4 m inside the right towers at x = 16.5. */
const TOWER_COPIES: readonly string[] = [
  ...new Array<string>(4).fill('tower-3@16.1,-2'),
  ...new Array<string>(4).fill('tower-4@16.1,-11'),
];

/** Each fixture added by the mirror, as `trussId@x,z`, sorted, so a list compare shows link and place together. */
function copiesOf(before: StageDesign, after: StageDesign): string[] {
  const old = new Set(before.fixtures.map((f) => f.id));
  const copies = after.fixtures.filter((f) => !old.has(f.id));
  return copies.map((f) => `${f.trussId}@${f.position[0]},${f.position[2]}`).sort();
}

/** The positions of the fixtures linked to `trussId`, as `x,y,z` lines. */
const placesOn = (d: StageDesign, trussId: string): string[] =>
  d.fixtures.filter((f) => f.trussId === trussId).map((f) => f.position.join(','));

describe('QA5 mirror on the festival after one side is deleted', () => {
  it('restores the right side: every copy links to the twin truss that still stands', () => {
    const cut = deleteFixtures(festival, rightIds);
    const mirrored = mirrorLeftToRight(cut);
    expect([mirrored.trusses.length, mirrored.fixtures.length]).toEqual([festival.trusses.length, 147]);
    const towerCopies = copiesOf(cut, mirrored).filter((line) => line.startsWith('tower-'));
    expect(towerCopies).toEqual(TOWER_COPIES);
    expect(copiesOf(cut, mirrored).some((line) => /^(tower-1|tower-2)@/.test(line))).toBe(false);
  });

  it('adds mirror towers for deleted right towers and links their copies to them', () => {
    const cut = deleteTruss(deleteTruss(festival, 'tower-3'), 'tower-4');
    const mirrored = mirrorLeftToRight(cut);
    const added = mirrored.trusses.filter((t) => !cut.trusses.includes(t));
    expect(added.map((t) => [t.id, t.name, t.transform.position])).toEqual([
      ['tower-3', 'Side tower 1 mirror', [16.5, 0, -2]],
      ['tower-4', 'Side tower 2 mirror', [16.5, 0, -11]],
    ]);
    expect(copiesOf(cut, mirrored).filter((line) => line.startsWith('tower-'))).toEqual(TOWER_COPIES);
  });

  it('keeps the right copies in place when the left tower moves', () => {
    const mirrored = mirrorLeftToRight(deleteTruss(deleteTruss(festival, 'tower-3'), 'tower-4'));
    const moved = moveTruss(mirrored, 'tower-1', [-1, 0, 0.5]);
    expect([placesOn(moved, 'tower-3'), placesOn(moved, 'tower-1').map((p) => p.split(',')[0])]).toEqual([
      placesOn(mirrored, 'tower-3'),
      new Array<string>(4).fill('-17.1'),
    ]);
  });

  it('keeps the copies on a standing twin tower in place when the left tower moves', () => {
    const mirrored = mirrorLeftToRight(deleteFixtures(festival, rightIds));
    const moved = moveTruss(mirrored, 'tower-2', [0, 2, 0]);
    expect(placesOn(moved, 'tower-4')).toEqual(placesOn(mirrored, 'tower-4'));
  });

  // QA5 finding: festival.ts hangs the 8 ring washes at phase 0.25 (F4), angles 11.25 + 45k degrees, whose mirror
  // image (33.75 + 45k) is a different set, so mirror on the stock festival adds 4 ring washes. Flip when decided.
  it.fails('adds nothing on the untouched festival, like on the other templates', () => {
    expect(mirrorLeftToRight(festival)).toBe(festival);
  });
});
