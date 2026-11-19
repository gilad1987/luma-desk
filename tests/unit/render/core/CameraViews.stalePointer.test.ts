/**
 * A pointer whose pointerup never came to the canvas (the canvas left the page during a press, the capture was lost)
 * must not make every later gesture a move: the next primary press forgets it (review R2-38).
 */
import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { CameraViews } from '../../../../src/render/camera/CameraViews';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { asReal } from '../../../shared/dom';

const RIG: StageBounds = { min: [-20, 0, -14], max: [20, 14, 4] };

type Step = [type: string, x: number, pointerId: number, pointerType: string, isPrimary: boolean];

/** A canvas that dispatches pointer events to the real OrbitControls handlers, 600 px high as their rotate scale. */
function pointerCanvas(): HTMLCanvasElement {
  const capture = { setPointerCapture: () => {}, releasePointerCapture: () => {} };
  return asReal<HTMLCanvasElement>(Object.assign(new EventTarget(), { style: {}, clientHeight: 600, ...capture }));
}

/** Sends each step as the browser sends it to the canvas at (x, 0), with the left button. */
function gesture(v: CameraViews, steps: readonly Step[]): void {
  for (const [type, x, pointerId, pointerType, isPrimary] of steps) {
    const fields = { pointerId, pointerType, isPrimary, button: 0, clientX: x, clientY: 0, pageX: x, pageY: 0 };
    v.controls.domElement.dispatchEvent(Object.assign(new Event(type), fields));
  }
}

describe('CameraViews after a pointer that never came up', () => {
  it.each<[string, Step[]]>([
    ['one finger', [['pointerdown', 50, 7, 'touch', true]]],
    [
      'a pinch',
      [
        ['pointerdown', 50, 7, 'touch', true],
        ['pointerdown', 250, 8, 'touch', false],
      ],
    ],
  ])('keeps fitting the view after a 3 px mouse click that follows %s left down', (_label, stale) => {
    const v = new CameraViews(pointerCanvas(), { isMaLayout: () => false, onViewChanged: () => undefined });
    v.camera.aspect = 16 / 9;
    v.camera.updateProjectionMatrix();
    v.fitTo(RIG, mvrViews(RIG, []));
    v.setView('front', true);
    v.controls.enableDamping = false;
    gesture(v, stale);
    const before = v.camera.position.clone();
    gesture(v, [
      ['pointerdown', 100, 1, 'mouse', true],
      ['pointermove', 103, 1, 'mouse', true],
      ['pointerup', 103, 1, 'mouse', true],
    ]);
    const turned = v.camera.position.clone();
    expect(turned.distanceTo(before)).toBeGreaterThan(0.01);
    v.camera.aspect = 4 / 3;
    v.camera.updateProjectionMatrix();
    v.updateControls();
    expect(v.camera.position.distanceTo(turned)).toBeGreaterThan(0.1);
  });
});
