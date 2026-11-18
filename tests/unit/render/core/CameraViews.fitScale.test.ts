/**
 * The fit scale rule (G7): the larger of the width and the depth ratio sets the scale, the margin ramps in from the
 * reference bounds, and a tiny stage is framed at `MIN_SCALE`. Each case reads the FOH eye-to-target distance, which
 * a fit multiplies by exactly the scale.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Vec3Tuple } from '../../../../src/core';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import { createTemplate } from '../../../../src/domain/stage/templates/index';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { fitViews } from '../../../../src/render/camera/fitViews';
import { VIEWS, type CameraView } from '../../../../src/render/camera/viewTable';

const reach = ({ position, target }: CameraView): number => new Vector3(...position).distanceTo(new Vector3(...target));
const fohReach = (bounds: StageBounds): number => reach(fitViews(bounds).foh);
const reference = boundsOf(BUILT_IN_DESIGN);
const size = (b: StageBounds): Vec3Tuple => [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
/** A fixture on the downstage edge of the built-in bounds (z = 33.6), so moving it moves the bounds. */
const farFixture = BUILT_IN_DESIGN.fixtures.find((f) => f.position[2] === reference.max[2]);
if (!farFixture) throw new Error(`fitScale test: no built-in fixture at the bounds edge z = ${reference.max[2]}`);

describe('fitViews scale', () => {
  it('scales a deep, narrow stage by its depth ratio times the full 1.4 margin', () => {
    const deep: StageBounds = { min: [-2, 0, -60], max: [2, 1, 0] };
    const scale = (1.4 * 60) / size(reference)[2];
    expect(scale).toBeGreaterThan(1);
    expect(fohReach(deep) / reach(VIEWS.foh)).toBeCloseTo(scale, 9);
  });

  it('moves the FOH eye by less than 1 percent when one far fixture of the built-in stage moves 1 cm', () => {
    const fixtures = BUILT_IN_DESIGN.fixtures.map((f) => {
      if (f.id !== farFixture.id) return f;
      return { ...f, position: [f.position[0], f.position[1], f.position[2] + 0.01] as const };
    });
    const moved = boundsOf({ ...BUILT_IN_DESIGN, fixtures });
    expect(moved.max[2]).toBeCloseTo(33.61, 9);
    expect(Math.abs(fohReach(moved) / reach(VIEWS.foh) - 1)).toBeLessThan(0.01);
  });

  it('frames the empty template at the minimum scale, a quarter of the built-in FOH distance', () => {
    expect(fohReach(boundsOf(createTemplate('empty')))).toBeCloseTo(0.25 * reach(VIEWS.foh), 9);
  });

  it.each(['theatre', 'festival'] as const)('brings the FOH eye nearer than today for the %s stage', (id) => {
    expect(fohReach(boundsOf(createTemplate(id)))).toBeLessThan(reach(VIEWS.foh));
  });
});
