/**
 * Owns the no-op rule: an edit that changes nothing returns the very same design object, so `History.push` adds no
 * undo step for it. Ops that do change the design are owned by their own test files.
 */
import { describe, expect, it } from 'vitest';
import { removeRiser, setDeckSize, setSceneryPart, setVenue } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { History } from '../../../../../src/domain/stage/edit/History.ts';
import * as items from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import { moveTruss, setTrussProps } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import { PIPE, sampleDesign } from './sampleDesign.ts';

/** The sample already mirrored, so a mirror has nothing left to copy; a black box with its default scenery. */
const base = (): StageDesign => mirrorLeftToRight(sampleDesign());
const WALL = { width: 6, height: 3 } as const;
/** The base with a 6 x 3 m LED wall, on and shown. */
const withWall = (): StageDesign => setLedWall(base(), WALL);
/** An off-centre span (-1.9 to 5.9) whose x1 - x0 is 7.800000000000001: `width` only up to float noise. */
const OFF_CENTRE = { x0: -1.9, x1: 5.9, width: 7.8 } as const;
/** The base deck moved to the off-centre span, so setting `OFF_CENTRE.width` again matches only with a tolerance. */
const offCentreDeck = (): StageDesign => {
  const d = base();
  return { ...d, deck: { ...d.deck, x0: OFF_CENTRE.x0, x1: OFF_CENTRE.x1 } };
};
/** The 6 x 3 m LED wall moved to the off-centre span, so its width matches `OFF_CENTRE.width` only with a tolerance. */
const offCentreWall = (): StageDesign => {
  const d = withWall();
  return { ...d, screens: d.screens.map((s) => ({ ...s, x0: OFF_CENTRE.x0, x1: OFF_CENTRE.x1 })) };
};

type NoOp = readonly [name: string, op: (d: StageDesign) => StageDesign, start?: () => StageDesign];

const NO_OPS: readonly NoOp[] = [
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
  ['setLedWall to the size and state it has', (d) => setLedWall(d, WALL), withWall],
  ['setTrussProps with an empty patch', (d) => setTrussProps(d, 'pipe-1', {})],
  [
    'setTrussProps to the values it has',
    (d) => setTrussProps(d, 'pipe-1', { name: 'Pipe 1', role: 'mid', params: { ...PIPE.params } }),
  ],
  ['setDeckSize to the size it has', (d) => setDeckSize(d, { width: 12, depth: 8, height: 1 })],
  [
    'setDeckSize again on an off-centre deck (float noise)',
    (d) => setDeckSize(d, { width: OFF_CENTRE.width, depth: 8, height: 1 }),
    offCentreDeck,
  ],
  [
    'setLedWall again on an off-centre wall (float noise)',
    (d) => setLedWall(d, { width: OFF_CENTRE.width, height: 3 }),
    offCentreWall,
  ],
  ['mirrorLeftToRight with nothing to copy', (d) => mirrorLeftToRight(d)],
];

describe('edits that change nothing', () => {
  const cases = NO_OPS.map(([name, op, start]) => [name, op, start ?? base] as const);
  it.each(cases)('%s returns the same design object', (_name, op, start) => {
    const d = start();
    expect(op(d)).toBe(d);
  });

  it('add no undo step (History.push TSDoc)', () => {
    const h = new History(createTemplate('theatre'));
    h.push(items.deleteTruss(h.current, 'no-such-truss'));
    h.push(mirrorLeftToRight(h.current));
    expect(h.canUndo).toBe(false);
  });
});
