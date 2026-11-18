/** A venue switch moves the camera views' FOH rig to the new venue's riser; the RoboSpot station follows the riser. */
import { Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { bootStageScene, rebuild } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('StageScene FOH rig', () => {
  it('takes the old riser and desk out of the FOH rig on a venue switch', () => {
    const boot = bootStageScene(BUILT_IN_DESIGN);
    const [riser, desk] = boot.venue.fohRig;
    if (!riser || !desk) throw new Error('Sultan’s Pool has no FOH riser');
    rebuild(boot, createTemplate('empty'));
    boot.views.fohRig.setVisible(false);
    expect([riser.visible, desk.visible]).toEqual([true, true]);
  });

  it('hides the RoboSpot station in the black box and the open field and shows it in Sultan’s Pool again', () => {
    const boot = bootStageScene(BUILT_IN_DESIGN);
    const station = new Object3D();
    boot.views.fohRig.addRider(station);
    expect(station.visible).toBe(true);
    for (const template of ['empty', 'festival'] as const) {
      rebuild(boot, createTemplate(template));
      boot.views.fohRig.setVisible(true);
      expect(station.visible).toBe(false);
    }
    rebuild(boot, BUILT_IN_DESIGN);
    expect(station.visible).toBe(true);
    const [riser] = boot.venue.fohRig;
    boot.views.fohRig.setVisible(false);
    expect([riser?.visible, station.visible]).toEqual([false, false]);
  });

  it('hides the station of a black-box boot until a venue with a riser comes', () => {
    const boot = bootStageScene(createTemplate('empty'));
    const station = new Object3D();
    boot.views.fohRig.addRider(station);
    expect(station.visible).toBe(false);
    rebuild(boot, BUILT_IN_DESIGN);
    expect(station.visible).toBe(true);
  });
});
