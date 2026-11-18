/**
 * CameraViews.fitTo (G7): the built-in bounds give today's views bit for bit (so the boot call changes no
 * screenshot), null restores the built-in table, and every stage's deck shows whole, and not tiny, in the FOH frame
 * at 4:3 and 16:9, also for tight decks that fill their bounds. The scale rule is in CameraViews.fitScale.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import { setDeckSize } from '../../../../src/domain/stage/edit/deckOps';
import { createTemplate } from '../../../../src/domain/stage/templates/index';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { CameraViews } from '../../../../src/render/camera/CameraViews';
import { fitViews } from '../../../../src/render/camera/fitViews';
import { VIEWS, type ViewName } from '../../../../src/render/camera/viewTable';
import { cameraViews, fohDeck } from './fohFrame';

const names = Object.keys(VIEWS) as ViewName[];

/** The camera pose after an instant move to each view, so the test reads what setView really used. */
function poses(v: CameraViews): number[][] {
  return names.map((name) => {
    v.setView(name, true);
    return [...v.camera.position.toArray(), ...v.controls.target.toArray(), v.camera.fov];
  });
}

/**
 * The stage canvas fills the window less the layout's fixed bars, so its aspect has no static minimum: the cases
 * are a 4:3 frame (the narrow desktop case) and a 16:9 one, each with every template and the built-in stage.
 */
const framings = (['builtIn', 'theatre', 'empty', 'festival'] as const).flatMap((id) => [
  [id, '4:3', 4 / 3] as const,
  [id, '16:9', 16 / 9] as const,
]);

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

  it.each(framings)(
    'shows the whole %s deck from FOH in a %s frame, at 30 to 100 percent of its width',
    (id, _, aspect) => {
      const { isInside, widthShare } = fohDeck(id === 'builtIn' ? BUILT_IN_DESIGN : createTemplate(id), aspect);
      expect(isInside).toBe(true);
      expect(widthShare).toBeGreaterThanOrEqual(0.3);
      expect(widthShare).toBeLessThanOrEqual(1);
    },
  );

  it.each([
    [20, 12],
    [30, 15],
    [46, 21.6],
  ])('shows a tight %s x %s m deck whole from FOH at 4:3, at 30 percent of the 16:9 width or more', (width, depth) => {
    const tight = setDeckSize(createTemplate('empty'), { width, depth, height: 1.2 });
    expect(fohDeck(tight, 4 / 3).isInside).toBe(true);
    expect(fohDeck(tight, 16 / 9).widthShare).toBeGreaterThanOrEqual(0.3);
  });

  it('gives finite, distinct eye and target points for the empty template', () => {
    const fitted = fitViews(boundsOf(createTemplate('empty')));
    for (const { position, target } of Object.values(fitted)) {
      expect([...position, ...target].every(Number.isFinite)).toBe(true);
      expect(position).not.toEqual(target);
    }
  });
});
