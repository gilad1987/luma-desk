/**
 * Owns the pure geometry of the builder top view: the world/canvas transform, the truss footprints, the nearest pick
 * and the selection a click makes. The canvas, the frame throttle and the drag gesture are in `topView.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { NO_SELECTION } from '../../../../src/ui/builder/selection';
import { pickAt, selectionAfterPick, type TopPick } from '../../../../src/ui/builder/topViewPick';
import { trussFootprint } from '../../../../src/ui/builder/topViewShapes';
import { fitTransform } from '../../../../src/ui/builder/topViewTransform';

/** 20 m square bounds in a 448 px canvas: (448 - 2 * 24 margin) / 20 = 20 px per metre, centre at pixel 224. */
const view = fitTransform({ min: [-10, 0, -10], max: [10, 3, 10] }, { width: 448, height: 448 });
const theatre = createTemplate('theatre');

describe('fitTransform', () => {
  it('fits the bounds with one scale, upstage at the top, and maps back to the same world point', () => {
    expect([
      view.scale,
      view.toCanvas(0, 0),
      view.toCanvas(-10, -10),
      view.toWorld(...view.toCanvas(3.7, -2.25)),
    ]).toEqual([20, [224, 224], [24, 24], [3.7, -2.25]]);
  });

  it('keeps one scale for a wide stage, so a ring stays round', () => {
    const wide = fitTransform({ min: [-20, 0, -5], max: [20, 0, 5] }, { width: 448, height: 448 });
    expect([wide.scale, wide.toCanvas(20, 5)]).toEqual([10, [424, 274]]);
  });
});

describe('trussFootprint', () => {
  it('draws a straight truss as the line between its ends and a circle as a ring', () => {
    const [front] = theatre.trusses;
    if (!front) throw new Error('the theatre template has trusses');
    const ring = { ...front, params: { kind: 'circle', radius: 4, section: 0.3 } } as const;
    expect(trussFootprint(front)).toEqual({
      kind: 'outline',
      points: [
        [-6, 2],
        [6, 2],
      ],
    });
    expect(trussFootprint(ring)).toEqual({ kind: 'ring', centre: [0, 2], radius: 4 });
  });

  it('makes the footprint of a truss once, however many frames draw it', () => {
    const [front] = theatre.trusses;
    if (!front) throw new Error('the theatre template has trusses');
    expect(trussFootprint(front)).toBe(trussFootprint(front));
  });
});

describe('pickAt', () => {
  const fitted = fitTransform({ min: [-8, 0, -8], max: [8, 0, 8] }, { width: 448, height: 448 });
  const [first] = theatre.fixtures;
  if (!first) throw new Error('the theatre template has fixtures');

  it('picks the fixture under the pointer before the truss it hangs on', () => {
    const [px, py] = fitted.toCanvas(first.position[0], first.position[2]);
    expect(pickAt(theatre, fitted, [px + 3, py - 3])).toEqual({ kind: 'fixture', id: first.id, anchor: [-5, 2] });
  });

  it('picks a truss by its line when no fixture is near', () => {
    const bare = { ...theatre, fixtures: [] };
    expect(pickAt(bare, fitted, fitted.toCanvas(1.25, 2.1))).toEqual({ kind: 'truss', id: 'front', anchor: [0, 2] });
  });

  it('picks nothing farther than the 22 px radius', () => {
    const bare = { ...theatre, fixtures: [] };
    const [px, py] = fitted.toCanvas(1.25, 2);
    expect([pickAt(bare, fitted, [px, py + 21]), pickAt(bare, fitted, [px, py + 23])]).toEqual([
      { kind: 'truss', id: 'front', anchor: [0, 2] },
      null,
    ]);
  });
});

describe('selectionAfterPick', () => {
  const fixture: TopPick = { kind: 'fixture', id: 7, anchor: [0, 0] };
  const truss: TopPick = { kind: 'truss', id: 'front', anchor: [0, 0] };
  const both = { fixtures: [7], trusses: ['front'] };

  it('replaces the selection on a plain click, adds with Shift and keeps it when the item is already picked', () => {
    expect([
      selectionAfterPick({ fixtures: [1], trusses: [] }, truss, false),
      selectionAfterPick({ fixtures: [1], trusses: [] }, fixture, true),
      selectionAfterPick(both, fixture, false),
    ]).toEqual([{ fixtures: [], trusses: ['front'] }, { fixtures: [1, 7], trusses: [] }, both]);
  });

  it('clears on a plain click on empty floor and keeps the selection with Shift', () => {
    expect([selectionAfterPick(both, null, false), selectionAfterPick(both, null, true)]).toEqual([NO_SELECTION, both]);
  });
});
