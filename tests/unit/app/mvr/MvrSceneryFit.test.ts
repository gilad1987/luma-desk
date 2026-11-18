/**
 * Owns the beam surfaces of a shown MVR scenery (W5): beams land on the design's deck and on the tops of the file's
 * meshes, set after the stage rebuild set the design's own, and the next stage's rebuild owns them again.
 */
import { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { MvrSceneryFit } from '../../../../src/app/mvr/MvrSceneryFit';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds';
import type { MvrGeometry } from '../../../../src/mvr/index';
import { mvrSurfaces } from '../../../../src/render/mvr/mvrSurfaces';

/** A made-up scenery with one set mesh top, where its beams land. */
const GEOMETRY: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-30, 0, -40], max: [30, 12, 40] },
  surfaces: [{ min: [-8, 0, -12], max: [8, 1.5, -4], face: 'top' }],
  layers: [],
  hallLayers: [],
};

/** A fit over fake camera views in the FOH view and fake beam surfaces. */
function sceneryFit() {
  const views = { fitTo: vi.fn(), setView: vi.fn(), currentView: 'foh' as const };
  const surfaceHit = { setSurfaces: vi.fn(), setVenue: vi.fn(), setScenery: vi.fn() };
  return { fit: new MvrSceneryFit({ views, surfaceHit }), surfaceHit, views };
}

/** The built scenery group; the fake surface hit only passes it on. */
const MESHES = new Object3D();

describe('MvrSceneryFit beam surfaces', () => {
  it('lands beams on the design boxes and the scenery triangles, in the design venue', () => {
    const { fit, surfaceHit } = sceneryFit();
    const design = createTemplate('theatre');
    fit.fit(design, GEOMETRY, MESHES);
    expect(surfaceHit.setSurfaces).toHaveBeenCalledWith(mvrSurfaces(design));
    expect(surfaceHit.setVenue).toHaveBeenCalledWith(design.venue.kind);
    expect(mvrSurfaces(design)).not.toContainEqual(GEOMETRY.surfaces[0]);
    expect(surfaceHit.setScenery).toHaveBeenCalledWith(MESHES);
  });

  it('sets them again for a same-file rebuild, and not after the scenery is forgotten', () => {
    const { fit, surfaceHit } = sceneryFit();
    fit.fit(createTemplate('theatre'), GEOMETRY, MESHES);
    const edited = createTemplate('festival');
    fit.refit(edited);
    expect(surfaceHit.setSurfaces).toHaveBeenLastCalledWith(mvrSurfaces(edited));
    expect(surfaceHit.setVenue).toHaveBeenLastCalledWith(edited.venue.kind);
    fit.forget();
    expect(surfaceHit.setScenery).toHaveBeenLastCalledWith(null);
    fit.refit(edited);
    expect(surfaceHit.setSurfaces).toHaveBeenCalledTimes(2);
  });

  it('fits the views and surfaces again for a layer toggle, with the new hidden layers', () => {
    const { fit, surfaceHit, views } = sceneryFit();
    const design = { ...createTemplate('theatre'), mvr: { hiddenLayers: [] } } as unknown as StageDesign;
    fit.hide(['hall']);
    expect(views.fitTo).not.toHaveBeenCalled();
    fit.fit(design, GEOMETRY, MESHES);
    fit.hide(['hall']);
    const hidden = { ...design, mvr: { ...design.mvr, hiddenLayers: ['hall'] } } as StageDesign;
    expect(surfaceHit.setSurfaces).toHaveBeenLastCalledWith(mvrSurfaces(hidden));
    expect(surfaceHit.setVenue).toHaveBeenLastCalledWith(hidden.venue.kind);
    expect(views.fitTo).toHaveBeenLastCalledWith(mvrCameraBounds(hidden, GEOMETRY), expect.anything());
    expect(views.setView).toHaveBeenCalledTimes(2);
  });

  it('sets nothing before a scenery is shown', () => {
    const { fit, surfaceHit } = sceneryFit();
    fit.refit(createTemplate('theatre'));
    expect(surfaceHit.setSurfaces).not.toHaveBeenCalled();
    expect(surfaceHit.setVenue).not.toHaveBeenCalled();
  });
});
