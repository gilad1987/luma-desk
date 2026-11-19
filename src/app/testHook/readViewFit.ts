import { Vector3, type PerspectiveCamera } from 'three';
import type { StageBounds } from '../../domain/stage/types';
import { boxCorners } from '../../render/camera/boxFit';
import type { CameraViews } from '../../render/camera/CameraViews';
import type { ScreenRect } from '../../render/camera/viewFrame';

/**
 * How the camera frames an imported stage, as `__desk.test.viewFit()` reports it, in CSS pixels of the page. `rig` is
 * the screen rectangle around the projected rig box (FOH, Front and Side hold it in frame) and `house` the one around
 * the rig and the seats (Wide and Top): null for a stage without one (built-in, template) and while a corner of the
 * box is behind the eye, where a projection means nothing. `free` is the part of the 3D view that the MA console does
 * not cover. `outliers` counts the fixtures that stand far from the rig box.
 */
export interface ViewFitInfo {
  readonly rig: ScreenRect | null;
  readonly house: ScreenRect | null;
  readonly free: ScreenRect;
  readonly outliers: number;
  /** The views whose eye has no clear zone and kept its best place, with how badly objects are in its way. */
  readonly unclear: Readonly<Record<string, number>>;
}

/** The rectangle around screen points. */
function around(points: readonly { readonly x: number; readonly y: number }[]): ScreenRect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** The screen rectangle around `box` through `camera` on `canvas`; null without a box or with a corner behind the eye. */
function onScreen(box: StageBounds | null, camera: PerspectiveCamera, canvas: DOMRect): ScreenRect | null {
  if (!box) return null;
  const corners = boxCorners(box).map((corner) => new Vector3(...corner));
  const isBehind = corners.some((corner) => corner.clone().applyMatrix4(camera.matrixWorldInverse).z >= 0);
  if (isBehind) return null;
  const points = corners.map((corner) => {
    const ndc = corner.project(camera);
    return { x: canvas.left + ((ndc.x + 1) / 2) * canvas.width, y: canvas.top + ((1 - ndc.y) / 2) * canvas.height };
  });
  return around(points);
}

/**
 * Measures the frame from what is on screen, not from what the fit assumed: the box corners go through the camera's
 * own projection matrix (lens, aspect and view offset as the renderer set them), and the free rectangle ends at the
 * top edge of the MA console element. A wrong fit rule so shows as a rectangle outside the free one.
 */
export function readViewFit(views: Pick<CameraViews, 'camera' | 'controls' | 'table'>): ViewFitInfo {
  const { camera, table } = views;
  const element = views.controls.domElement;
  // the controls may listen on a document in other apps; here they always get the stage canvas
  const canvas = element instanceof HTMLElement ? element.getBoundingClientRect() : new DOMRect();
  const desk = document.body.classList.contains('ma') ? document.getElementById('maConsole') : null;
  const bottom = Math.min(canvas.bottom, desk?.getBoundingClientRect().top ?? canvas.bottom);
  const free = { x: canvas.left, y: canvas.top, width: canvas.width, height: bottom - canvas.top };
  camera.updateMatrixWorld();
  return {
    rig: onScreen(table.rig, camera, canvas),
    house: onScreen(table.house, camera, canvas),
    free,
    outliers: table.outliers,
    unclear: table.unclear,
  };
}
