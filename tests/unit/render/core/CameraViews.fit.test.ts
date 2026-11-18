/**
 * CameraViews.fitTo (G7): the built-in bounds give today's views bit for bit (so the boot call changes no
 * screenshot), null restores the built-in table, and a small or empty stage gets finite views that keep its deck in
 * the FOH frame.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import { createTemplate } from '../../../../src/domain/stage/templates/index';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { CameraViews } from '../../../../src/render/camera/CameraViews';
import { fitViews } from '../../../../src/render/camera/fitViews';
import { VIEWS, type ViewName } from '../../../../src/render/camera/viewTable';
import { fakeCanvas } from '../fakeCanvas';

const names = Object.keys(VIEWS) as ViewName[];

function cameraViews(): CameraViews {
  return new CameraViews(fakeCanvas(), { isMaLayout: () => false, onViewChanged: () => undefined });
}

/** The camera pose after an instant move to each view, so the test reads what setView really used. */
function poses(v: CameraViews): number[][] {
  return names.map((name) => {
    v.setView(name, true);
    return [...v.camera.position.toArray(), ...v.controls.target.toArray(), v.camera.fov];
  });
}

/** Whether every deck top corner projects inside the camera's frame. */
function framesDeck(v: CameraViews, { min, max }: StageBounds): boolean {
  v.camera.updateMatrixWorld();
  const corners = [min[0], max[0]].flatMap((x) => [min[2], max[2]].map((z) => new Vector3(x, max[1], z)));
  return corners.every((c) =>
    c
      .project(v.camera)
      .toArray()
      .every((n) => Math.abs(n) <= 1),
  );
}

describe('CameraViews.fitTo', () => {
  it('gives exactly the built-in views for the built-in bounds', () => {
    expect(fitViews(boundsOf(BUILT_IN_DESIGN))).toStrictEqual(VIEWS);
    const fitted = cameraViews();
    fitted.fitTo(boundsOf(BUILT_IN_DESIGN));
    expect(poses(fitted)).toStrictEqual(poses(cameraViews()));
  });

  it('restores the built-in views on null after a fit to another stage', () => {
    const v = cameraViews();
    const builtIn = poses(v);
    v.fitTo(boundsOf(createTemplate('theatre')));
    expect(poses(v)).not.toEqual(builtIn);
    v.fitTo(null);
    expect(poses(v)).toStrictEqual(builtIn);
  });

  it('keeps every view name and lens, and only swaps the table until the next setView', () => {
    const v = cameraViews();
    v.setView('top', true);
    const before = v.camera.position.toArray();
    v.fitTo(boundsOf(createTemplate('theatre')));
    expect(v.camera.position.toArray()).toEqual(before);
    const fitted = fitViews(boundsOf(createTemplate('theatre')));
    expect([Object.keys(fitted), fitted.fohMa.fov]).toEqual([names, 60]);
  });

  it.each(['theatre', 'empty', 'festival'] as const)('frames the %s deck from FOH, nearer than today', (id) => {
    const design = createTemplate(id);
    const v = cameraViews();
    // the stage canvas is wide in the app; the fake canvas would give a square frame
    v.camera.aspect = 16 / 9;
    v.fitTo(boundsOf(design));
    v.setView('foh', true);
    const { x0, x1, z0, z1, height } = design.deck;
    expect(framesDeck(v, { min: [x0, 0, z0], max: [x1, height, z1] })).toBe(true);
    expect(v.camera.position.distanceTo(v.controls.target)).toBeLessThan(new Vector3(0, 7, 82).length());
  });

  it('gives finite, distinct eye and target points for the empty template', () => {
    const fitted = fitViews(boundsOf(createTemplate('empty')));
    for (const { position, target } of Object.values(fitted)) {
      expect([...position, ...target].every(Number.isFinite)).toBe(true);
      expect(position).not.toEqual(target);
    }
  });
});
