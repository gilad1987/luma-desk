/**
 * Owns the drag result of the plan view: the snap of the grabbed item to the 0.5 m (Alt 0.1 m) grid and the one edit
 * op that moves the selection. The pointer gesture that calls them is in `PlanView.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { roundToMillimetre } from '../../../../../src/domain/stage/edit/millimetres';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import { FINE_SNAP_M, moveSelection, SNAP_M, snappedTarget } from '../../../../../src/ui/builder/plan/planMove';

const theatre = createTemplate('theatre');
const positionOf = (d: typeof theatre, id: number): unknown => d.fixtures.find((f) => f.id === id)?.position;

describe('snappedTarget', () => {
  it('lands an off-grid item on the nearest 0.5 m grid point, not on a 0.5 m step from where it was', () => {
    // 0.25 + 1.2 = 1.45 snaps to 1.5; -1.25 + 0.1 = -1.15 snaps to -1 (a snapped delta would land on 1.25 and -1.25)
    expect(snappedTarget([0.25, -1.25], [1.2, 0.1], SNAP_M)).toEqual([1.5, -1]);
  });

  it('snaps to exact 0.1 m grid values with Alt, without float noise', () => {
    // 0.1 + 0.17 = 0.27 lands on the literal 0.3, not on 0.1 + 0.2 = 0.30000000000000004
    const target = snappedTarget([0.1, 2.4], [0.17, 0.33], FINE_SNAP_M);
    expect([Object.is(target[0], 0.3), Object.is(target[1], 2.7)]).toEqual([true, true]);
  });
});

describe('moveSelection', () => {
  it('moves a picked truss with its fixtures once, and a loose picked fixture by itself', () => {
    const onFront = theatre.fixtures.filter((f) => f.trussId === 'front').map((f) => f.id);
    const loose = theatre.fixtures.find((f) => f.trussId !== 'front');
    const [firstOnFront] = onFront;
    if (!loose || firstOnFront === undefined) throw new Error('the theatre template has fixtures on several trusses');
    const next = moveSelection({ fixtures: [firstOnFront, loose.id], trusses: ['front'] }, [1, 0, -0.5])(theatre);
    const before = theatre.fixtures.find((f) => f.id === firstOnFront)?.position;
    if (!before) throw new Error('the fixture exists');
    expect([positionOf(next, firstOnFront), positionOf(next, loose.id)]).toEqual([
      [before[0] + 1, before[1], before[2] - 0.5],
      roundToMillimetre([loose.position[0] + 1, loose.position[1], loose.position[2] - 0.5]),
    ]);
  });

  it('moves a vertical-only drag on z alone: the truss, its fixtures and a loose fixture keep their x', () => {
    const onFront = theatre.fixtures.find((f) => f.trussId === 'front');
    const loose = theatre.fixtures.find((f) => f.trussId !== 'front');
    const front = theatre.trusses.find((t) => t.id === 'front');
    if (!onFront || !loose || !front) throw new Error('the theatre template has a front truss and other fixtures');
    const next = moveSelection({ fixtures: [loose.id], trusses: ['front'] }, [0, 0, -1.5])(theatre);
    const [x, y, z] = front.transform.position;
    expect([next.trusses.find((t) => t.id === 'front')?.transform.position, positionOf(next, onFront.id)]).toEqual([
      roundToMillimetre([x, y, z - 1.5]),
      roundToMillimetre([onFront.position[0], onFront.position[1], onFront.position[2] - 1.5]),
    ]);
    expect(positionOf(next, loose.id)).toEqual(
      roundToMillimetre([loose.position[0], loose.position[1], loose.position[2] - 1.5]),
    );
  });

  it('moves the pixel line of a loose fixture with it (Sultan’s Pool 1201)', () => {
    const pool = createTemplate('sultans-pool');
    const pixelOf = (d: typeof pool): unknown => d.fixtures.find((f) => f.id === 1201)?.pixel?.p;
    const before = pool.fixtures.find((f) => f.id === 1201)?.pixel?.p;
    if (!before) throw new Error('fixture 1201 has a pixel line');
    const next = moveSelection({ fixtures: [1201], trusses: [] }, [2, 0, 0])(pool);
    expect(pixelOf(next)).toEqual(roundToMillimetre([before[0] + 2, before[1], before[2]]));
  });
});
