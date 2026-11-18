/**
 * Camera helpers shared by the G7 fit tests: a CameraViews on a fake canvas, and where a fitted FOH view puts a
 * stage's deck in the frame.
 */
import { Vector3 } from 'three';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { CameraViews } from '../../../../src/render/camera/CameraViews';
import { fakeCanvas } from '../fakeCanvas';

/** A CameraViews with the plain layout and no view-change listener. */
export function cameraViews(): CameraViews {
  return new CameraViews(fakeCanvas(), { isMaLayout: () => false, onViewChanged: () => undefined });
}

/** The FOH view's deck top corners in NDC for an app frame aspect: all inside the frame, and the deck's width share. */
export function fohDeck(design: StageDesign, aspect: number): { isInside: boolean; widthShare: number } {
  const v = cameraViews();
  v.camera.aspect = aspect;
  v.fitTo(boundsOf(design));
  v.setView('foh', true);
  v.camera.updateMatrixWorld();
  const { x0, x1, z0, z1, height } = design.deck;
  const ndc = [x0, x1].flatMap((x) => [z0, z1].map((z) => new Vector3(x, height, z).project(v.camera)));
  const xs = ndc.map((n) => n.x);
  const isInside = ndc.every((n) => Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1);
  return { isInside, widthShare: (Math.max(...xs) - Math.min(...xs)) / 2 };
}
