// @vitest-environment jsdom
/**
 * The exported bodies land where the design has its parts: the deck, every riser and every screen face within 1 mm
 * after export and import, and every truss end point inside its truss body. The boxes come from the import's own
 * mesh bounds and placement matrices, so this checks the mesh frame (m, Y up, object local) against the pose.
 */
import { describe, expect, it } from 'vitest';
import { trussPoints } from '../../../../../src/domain/stage/bounds.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import type { Vec3 } from '../../../../../src/domain/stage/types.ts';
import { exportContext } from '../../../../../src/mvr/export/ExportContext.ts';
import type { Aabb } from '../../../../../src/mvr/math/Aabb.ts';
import { exportedBoxes } from '../../../../shared/index.ts';

const MM = 0.001;
/** No template has risers yet, so the test adds two on the deck. */
const design: StageDesign = {
  ...createTemplate('festival'),
  risers: [
    { id: 'drums', at: [0, 1.4, -2], size: [3, 0.4, 2] },
    { id: 'keys', at: [3.5, 1.2, -1.5], size: [2, 0.2, 1.5] },
  ],
};
const { uuidOf } = exportContext(design);

const placedBoxes = (): Promise<ReadonlyMap<string, Aabb>> => exportedBoxes(design);

function expectBox(actual: Aabb | undefined, min: Vec3, max: Vec3): void {
  min.forEach((value, axis) => expect(Math.abs((actual?.min[axis] ?? NaN) - value)).toBeLessThan(MM));
  max.forEach((value, axis) => expect(Math.abs((actual?.max[axis] ?? NaN) - value)).toBeLessThan(MM));
}

describe('exported bodies of the festival template with risers', () => {
  it('puts the deck and every riser where the design has them', async () => {
    const boxes = await placedBoxes();
    const { deck, risers } = design;
    expectBox(boxes.get(uuidOf('deck', 'deck')), [deck.x0, 0, deck.z0], [deck.x1, deck.height, deck.z1]);
    for (const { id, at, size } of risers) {
      const half: Vec3 = [size[0] / 2, size[1], size[2] / 2];
      expectBox(
        boxes.get(uuidOf('riser', id)),
        [at[0] - half[0], at[1] - half[1], at[2] - half[2]],
        [at[0] + half[0], at[1], at[2] + half[2]],
      );
    }
  });

  it('puts every LED wall face on the design wall', async () => {
    const boxes = await placedBoxes();
    expect(design.screens.length).toBeGreaterThan(0);
    for (const { id, x0, x1, y0, y1, z } of design.screens) {
      const box = boxes.get(uuidOf('screen', id));
      const face: Aabb | undefined = box && { min: [box.min[0], box.min[1], z], max: box.max };
      expectBox(face, [x0, y0, z], [x1, y1, z]);
    }
  });

  it('holds every truss end point inside its truss body', async () => {
    const boxes = await placedBoxes();
    for (const truss of design.trusses) {
      const box = boxes.get(uuidOf('truss', truss.id));
      for (const point of trussPoints(truss)) {
        point.toArray().forEach((value, axis) => {
          expect(value).toBeGreaterThanOrEqual((box?.min[axis] ?? NaN) - MM);
          expect(value).toBeLessThanOrEqual((box?.max[axis] ?? NaN) + MM);
        });
      }
    }
  });
});
