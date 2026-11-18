/**
 * A large MVR scenery is never clipped by the camera: after the fit to the design and scenery bounds, every corner of
 * a made-up 60 m x 80 m scenery lies inside the far plane from every named view, and the orbit controls have no
 * distance limit that would stop the user from backing out to see it.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { MvrGeometry } from '../../../../src/mvr/index';
import { VIEWS, type ViewName } from '../../../../src/render/camera/viewTable';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds';
import { cameraViews } from '../core/fohFrame';

/** A made-up scenery of 60 m x 80 m and 12 m high, much larger than any stage template. */
const GEOMETRY: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-30, 0, -40], max: [30, 12, 40] },
  surfaces: [],
};
const BOUNDS = mvrCameraBounds(createTemplate('theatre'), GEOMETRY);

/** The eight corners of the fitted bounds. */
const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(
  (i) =>
    new Vector3(
      i & 1 ? BOUNDS.max[0] : BOUNDS.min[0],
      i & 2 ? BOUNDS.max[1] : BOUNDS.min[1],
      i & 4 ? BOUNDS.max[2] : BOUNDS.min[2],
    ),
);

describe('the camera fit of a large MVR scenery', () => {
  it('keeps every scenery corner inside the far plane from every view', () => {
    const views = cameraViews();
    views.fitTo(BOUNDS);
    for (const name of Object.keys(VIEWS) as ViewName[]) {
      views.setView(name, true);
      const farthest = Math.max(...corners.map((c) => c.distanceTo(views.camera.position)));
      expect(farthest, name).toBeLessThan(views.camera.far);
    }
  });

  it('sets no orbit distance limit', () => {
    expect(cameraViews().controls.maxDistance).toBe(Infinity);
  });
});
