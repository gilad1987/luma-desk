/**
 * Owns where a fitted desk model meets its MVR insertion point: a hanging model has its top there, and a model built
 * upright on its stand (a static floor unit in the desk's own floor pose) has its foot there, so it stands on the
 * floor or riser and does not sink into it.
 */
import { Box3, BoxGeometry, Group, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { fitDeskModel } from '../../../../../src/render/fixtures/gdtf/fitDeskModel';

/** A 1 m cube model whose origin is its centre, in a group 2 m up; fitted to a box 0.4 m wide and deep, 0.8 m high. */
function fitted(standing: boolean): { box: Box3; moved: number } {
  const g = new Group();
  g.position.set(0, 2, 0);
  g.add(new Mesh(new BoxGeometry(1, 1, 1)));
  const fit = fitDeskModel(g, [0.4, 0.8, 0.4], [0, 1, 0], standing);
  g.updateMatrixWorld(true);
  return { box: new Box3().setFromObject(g), moved: fit.axisAt.y };
}

describe('fitDeskModel insertion point', () => {
  it('stands a floor-standing body on its insertion point', () => {
    const { box, moved } = fitted(true);
    expect(box.min.y).toBeCloseTo(1, 6);
    expect(box.max.y).toBeCloseTo(1.8, 6);
    expect(moved).toBeCloseTo(-0.6, 6);
  });

  it('hangs a hanging body from its insertion point', () => {
    const { box } = fitted(false);
    expect(box.max.y).toBeCloseTo(1, 6);
    expect(box.min.y).toBeCloseTo(0.2, 6);
  });
});
