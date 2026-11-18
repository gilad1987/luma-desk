/**
 * Owns the drag result of the top view: the snap of the grabbed item to the 0.5 m (Alt 0.1 m) grid and the one edit
 * op that moves the selection. The pointer gesture that calls them is in `topView.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { FINE_SNAP_M, moveSelection, SNAP_M, snappedDelta } from '../../../../src/ui/builder/topViewMove';

const theatre = createTemplate('theatre');
const positionOf = (d: typeof theatre, id: number): unknown => d.fixtures.find((f) => f.id === id)?.position;

describe('snappedDelta', () => {
  it('lands an off-grid item on the nearest 0.5 m grid point, not on a 0.5 m step from where it was', () => {
    // 0.25 + 1.2 = 1.45 snaps to 1.5; -1.25 + 0.1 = -1.15 snaps to -1 (a snapped delta would be 1 and 0)
    expect(snappedDelta([0.25, -1.25], [1.2, 0.1], SNAP_M)).toEqual([1.25, 0, 0.25]);
  });

  it('snaps to 0.1 m with Alt, without float noise', () => {
    const [dx, , dz] = snappedDelta([0, 0], [0.26, 0.34], FINE_SNAP_M);
    expect([dx, dz]).toEqual([0.3, 0.3]);
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
      [loose.position[0] + 1, loose.position[1], loose.position[2] - 0.5],
    ]);
  });
});
