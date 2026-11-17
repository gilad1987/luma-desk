/**
 * QA2 findings against W1c. Each test states the behaviour the op's own TSDoc or its sibling op promises. They
 * are `it.fails` so the suite stays green while the bug is open; a fix turns them red: then drop `.fails`.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { setDeckSize, setLedWall } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { History } from '../../../../../src/domain/stage/edit/History.ts';
import { deleteTruss, mirrorStageLeft } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { moveTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';

/** A stage-left pipe drawn the way every template draws trusses: identity transform, world end points. */
function leftPipeAtOrigin(): StageDesign {
  const empty = createTemplate('empty');
  const pipe = {
    id: 'sl-pipe',
    name: 'SL pipe',
    role: 'mid' as const,
    transform: { position: [0, 0, 0] as const },
    params: { kind: 'straight' as const, a: [-8, 6, -2] as const, b: [-2, 6, -2] as const, section: 0.3 },
  };
  return addFixturesOnTruss({ ...empty, trusses: [pipe] }, { trussId: 'sl-pipe', type: 'spot', count: 3 });
}

describe('QA2 bug: mirror of a truss drawn with world end points', () => {
  it.fails('links mirrored fixtures to a stage-right truss, not to the stage-left source', () => {
    const d = mirrorStageLeft(leftPipeAtOrigin());
    const copies = d.fixtures.filter((f) => f.position[0] > 0);
    expect(copies).toHaveLength(3);
    expect(copies.every((f) => f.trussId !== 'sl-pipe')).toBe(true);
  });

  it.fails('leaves the mirrored fixtures in place when the stage-left truss moves', () => {
    const d = mirrorStageLeft(leftPipeAtOrigin());
    const moved = moveTruss(d, 'sl-pipe', [0, 1, 0]);
    const right = (x: StageDesign) => x.fixtures.filter((f) => f.position[0] > 0).map((f) => f.position);
    expect(right(moved)).toEqual(right(d));
  });
});

describe('QA2 bug: no-op edits add an undo step', () => {
  it.fails('adds no step for an edit that changed nothing (History.push TSDoc)', () => {
    const h = new History(createTemplate('theatre'));
    h.push(deleteTruss(h.current, 'no-such-truss'));
    h.push(mirrorStageLeft(h.current));
    expect(h.canUndo).toBe(false);
  });
});

describe('QA2 bug: LED wall and deck sizes are not checked', () => {
  const festival = createTemplate('festival');

  it.fails.each([0, -4, Number.NaN])('refuses an LED wall width of %s like setDeckSize refuses a bad deck', (w) => {
    expect(() => setLedWall(festival, { width: w, height: 8 })).toThrow(RangeError);
  });

  it.fails('refuses an infinite deck', () => {
    expect(() => setDeckSize(festival, { width: Infinity, depth: 8, height: 1 })).toThrow(RangeError);
  });
});
