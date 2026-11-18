/**
 * Owns the pick order of the builder top view on a dense rig: a fixture's own mark, then a tower, then a truss line,
 * then a fixture within the touch radius. The basic nearest pick and its radius are in `topViewGeometry.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { pickAt } from '../../../../src/ui/builder/topViewPick';
import { fitTransform } from '../../../../src/ui/builder/topViewTransform';

/** Every truss id that some point of a 2 px grid over the canvas picks. */
function pickableTrusses(width: number, height: number): Set<string> {
  const view = fitTransform(boundsOf(BUILT_IN_DESIGN), { width, height });
  const ids = new Set<string>();
  for (let y = 1; y < height; y += 2) {
    for (let x = 1; x < width; x += 2) {
      const pick = pickAt(BUILT_IN_DESIGN, view, [x, y]);
      if (pick?.kind === 'truss') ids.add(pick.id);
    }
  }
  return ids;
}

describe('pickAt on a dense rig', () => {
  const theatre = createTemplate('theatre');
  const view = fitTransform({ min: [-8, 0, -8], max: [8, 0, 8] }, { width: 448, height: 448 });
  const [first] = theatre.fixtures;
  if (!first) throw new Error('the theatre template has fixtures');
  const [px, py] = view.toCanvas(first.position[0], first.position[2]);

  it('picks the truss line beside a fixture, and the fixture on its own mark', () => {
    expect([pickAt(theatre, view, [px + 10, py]), pickAt(theatre, view, [px + 4, py])]).toEqual([
      { kind: 'truss', id: 'front', anchor: [0, 2] },
      { kind: 'fixture', id: first.id, anchor: [-5, 2] },
    ]);
  });

  it('still gives a fixture with no truss near it the full touch radius', () => {
    const bare = { ...theatre, trusses: [] };
    expect(pickAt(bare, view, [px + 15, py])).toEqual({ kind: 'fixture', id: first.id, anchor: [-5, 2] });
  });

  it('lets a click pick each of the 43 built-in trusses in an 800 x 600 view', () => {
    expect([pickableTrusses(800, 600).size, BUILT_IN_DESIGN.trusses.length]).toEqual([43, 43]);
  });
});
