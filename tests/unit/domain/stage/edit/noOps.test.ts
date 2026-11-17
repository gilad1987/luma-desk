/**
 * Owns the no-op rule: an edit that changes nothing returns the very same design object, so `History.push` adds no
 * undo step for it. Ops that do change the design are owned by their own test files.
 */
import { describe, expect, it } from 'vitest';
import { removeRiser, setSceneryPart, setVenue } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { History } from '../../../../../src/domain/stage/edit/History.ts';
import * as items from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import { moveTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import { sampleDesign } from './sampleDesign.ts';

/** The sample already mirrored, so a mirror has nothing left to copy; a black box with its default scenery. */
const base = (): StageDesign => mirrorLeftToRight(sampleDesign());

const NO_OPS: readonly (readonly [string, (d: StageDesign) => StageDesign])[] = [
  ['moveTruss by a zero delta', (d) => moveTruss(d, 'pipe-1', [0, 0, 0])],
  ['deleteFixtures of unknown ids', (d) => items.deleteFixtures(d, [998, 999])],
  ['deleteFixtures of no ids', (d) => items.deleteFixtures(d, [])],
  ['deleteTruss of an unknown id', (d) => items.deleteTruss(d, 'nope')],
  ['duplicateFixtures of unknown ids', (d) => items.duplicateFixtures(d, [999])],
  ['duplicateFixtures of no ids', (d) => items.duplicateFixtures(d, [])],
  ['removeRiser of an unknown id', (d) => removeRiser(d, 'nope')],
  ['setSceneryPart to the value it has', (d) => setSceneryPart(d, 'crowd', false)],
  ['setVenue to the venue it has, defaults set', (d) => setVenue(d, 'black-box')],
  [
    'setFixtureProps to the values it has',
    (d) => items.setFixtureProps(d, 101, { type: 'wash', position: [-2, 7, 0] }),
  ],
  ['setFixtureProps with an empty patch', (d) => items.setFixtureProps(d, 101, {})],
  ['setLedWall off without a wall', (d) => setLedWall(d, null)],
  ['mirrorLeftToRight with nothing to copy', (d) => mirrorLeftToRight(d)],
];

describe('edits that change nothing', () => {
  it.each(NO_OPS)('%s returns the same design object', (_name, op) => {
    const d = base();
    expect(op(d)).toBe(d);
  });

  it('add no undo step (History.push TSDoc)', () => {
    const h = new History(createTemplate('theatre'));
    h.push(items.deleteTruss(h.current, 'no-such-truss'));
    h.push(mirrorLeftToRight(h.current));
    expect(h.canUndo).toBe(false);
  });
});
