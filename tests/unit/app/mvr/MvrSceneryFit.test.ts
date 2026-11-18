/**
 * Owns the beam surfaces of a shown MVR scenery (W5): beams land on the design's deck and on the tops of the file's
 * meshes, set after the stage rebuild set the design's own, and the next stage's rebuild owns them again.
 */
import { describe, expect, it, vi } from 'vitest';
import { MvrSceneryFit } from '../../../../src/app/mvr/MvrSceneryFit';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { MvrGeometry } from '../../../../src/mvr/index';
import { mvrSurfaces } from '../../../../src/render/mvr/mvrSurfaces';

/** A made-up scenery with one set mesh top, where its beams land. */
const GEOMETRY: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-30, 0, -40], max: [30, 12, 40] },
  surfaces: [{ min: [-8, 0, -12], max: [8, 1.5, -4], face: 'top' }],
};

/** A fit over fake camera views in the FOH view and fake beam surfaces. */
function sceneryFit() {
  const views = { fitTo: vi.fn(), setView: vi.fn(), currentView: 'foh' as const };
  const surfaceHit = { setSurfaces: vi.fn() };
  return { fit: new MvrSceneryFit({ views, surfaceHit }), surfaceHit };
}

describe('MvrSceneryFit beam surfaces', () => {
  it('lands beams on the design and the scenery meshes, in the design venue', () => {
    const { fit, surfaceHit } = sceneryFit();
    const design = createTemplate('theatre');
    fit.fit(design, GEOMETRY);
    expect(surfaceHit.setSurfaces).toHaveBeenCalledWith(mvrSurfaces(design, GEOMETRY), design.venue.kind);
    expect(mvrSurfaces(design, GEOMETRY)).toContainEqual(GEOMETRY.surfaces[0]);
  });

  it('sets them again for a same-file rebuild, and not after the scenery is forgotten', () => {
    const { fit, surfaceHit } = sceneryFit();
    fit.fit(createTemplate('theatre'), GEOMETRY);
    const edited = createTemplate('festival');
    fit.refit(edited);
    expect(surfaceHit.setSurfaces).toHaveBeenLastCalledWith(mvrSurfaces(edited, GEOMETRY), edited.venue.kind);
    fit.forget();
    fit.refit(edited);
    expect(surfaceHit.setSurfaces).toHaveBeenCalledTimes(2);
  });

  it('sets nothing before a scenery is shown', () => {
    const { fit, surfaceHit } = sceneryFit();
    fit.refit(createTemplate('theatre'));
    expect(surfaceHit.setSurfaces).not.toHaveBeenCalled();
  });
});
