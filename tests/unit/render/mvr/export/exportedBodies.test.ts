// @vitest-environment jsdom
/**
 * The exported bodies that `exportedBounds.test.ts` does not pin down: a side screen turned by its yaw, and truss
 * bodies no larger than their truss, so a body built too big (a doubled length or section) fails, not only one built
 * too small.
 */
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { trussPoints } from '../../../../../src/domain/stage/bounds.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import { exportContext } from '../../../../../src/mvr/export/ExportContext.ts';
import { exportedBoxes } from '../../../../shared/index.ts';

const MM = 0.001;
/**
 * How far a truss body may reach past its points, in sections. A straight truss reaches half a section, a circle's
 * polygon corners and hang points about 0.7; a body built with a doubled section reaches a whole one and fails.
 */
const BODY_MARGIN = 0.75;
const festival = createTemplate('festival');
/** The festival LED wall with one side screen turned a quarter about Y, so its width runs along z. */
const design: StageDesign = {
  ...festival,
  screens: festival.screens.map((screen) => ({
    ...screen,
    sides: [{ at: [13, 6, -12], yaw: Math.PI / 2, width: 4, height: 3 }],
  })),
};
const { uuidOf } = exportContext(design);

describe('exported bodies of turned screens and trusses', () => {
  it('turns a side screen by its yaw: its width along z, only its depth along x', async () => {
    const boxes = await exportedBoxes(design);
    const [wall] = design.screens;
    const box = boxes.get(uuidOf('screen', `${wall?.id ?? ''}-side-1`));
    expect(box?.min[1]).toBeCloseTo(6 - 1.5, 3);
    expect(box?.max[1]).toBeCloseTo(6 + 1.5, 3);
    expect(box?.min[2]).toBeCloseTo(-12 - 2, 3);
    expect(box?.max[2]).toBeCloseTo(-12 + 2, 3);
    expect((box?.max[0] ?? NaN) - (box?.min[0] ?? NaN)).toBeLessThan(0.5);
    expect(box?.min[0]).toBeLessThanOrEqual(13 + MM);
    expect(box?.max[0]).toBeGreaterThanOrEqual(13 - MM);
  });

  it('keeps every truss body within its points widened by three quarters of its section', async () => {
    const boxes = await exportedBoxes(design);
    for (const truss of design.trusses) {
      if (!('section' in truss.params)) continue;
      const box = boxes.get(uuidOf('truss', truss.id));
      const body = box && new Box3(new Vector3(...box.min), new Vector3(...box.max));
      const limit = new Box3().setFromPoints(trussPoints(truss)).expandByScalar(BODY_MARGIN * truss.params.section);
      expect(body && limit.containsBox(body)).toBe(true);
    }
  });
});
