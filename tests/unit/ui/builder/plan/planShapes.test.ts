/**
 * Owns the truss geometry edge cases the panels and the plan view share: a tower grows upwards when its height is set
 * (`withDimension`), and a vertical tower draws as one point, not two equal ones (`trussFootprint`). The common
 * straight and circle cases are in `planGeometry.test.ts` and `TrussTab.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { trussFootprint } from '../../../../../src/ui/builder/plan/planShapes';
import { withDimension } from '../../../../../src/ui/builder/trussDimensions';
import { LEFT_TOWER } from '../../../domain/stage/edit/sampleDesign.ts';

describe('truss shapes', () => {
  it('stretches a tower along its own axis, so a new height moves the top up', () => {
    expect(withDimension(LEFT_TOWER.params, 'height', 6)).toEqual({ ...LEFT_TOWER.params, b: [0, 6, 0] });
  });

  it('draws a vertical tower as one point: its base and top are the same point from above', () => {
    expect(trussFootprint(LEFT_TOWER)).toEqual({ kind: 'outline', points: [[-4, -2]] });
  });
});
