import { WebGLRenderTarget } from 'three';
import { describe, expect, it } from 'vitest';
import { MVR_EXPOSURE } from '../../../../src/render/post/mvrTone';
import { ShowCamera } from '../../../../src/render/post/ShowCamera';
import { EXPOSURE_RANGE, exposureOf, SHOW_BAND } from '../../../../src/render/post/showExposure';
import { meterRenderer } from './meterRenderer';

/** A scene far over the band: every fixture at full. */
const FULL = SHOW_BAND.high + 6;
/** A scene inside the band: a show look. */
const LOOK = SHOW_BAND.high - 1;

describe('ShowCamera', () => {
  const frame = new WebGLRenderTarget(1, 1);

  it('is a function of the frame alone while the clock stands or steps: the same picture in every test run', () => {
    const { renderer, scene, readings, targets } = meterRenderer(FULL);
    const camera = new ShowCamera();
    camera.expose(renderer, frame, 10);
    expect(renderer.toneMappingExposure).toBeCloseTo(MVR_EXPOSURE / 2, 9);
    scene.stops = LOOK;
    camera.expose(renderer, frame, 10);
    expect(renderer.toneMappingExposure).toBe(MVR_EXPOSURE);
    scene.stops = FULL;
    camera.expose(renderer, frame, 10.5);
    expect(renderer.toneMappingExposure).toBeCloseTo(MVR_EXPOSURE / 2, 9);
    expect(readings()).toBe(3);
    // every reading gives the render target back to the pass that drew
    expect(targets.filter((target) => target === 'drawn')).toHaveLength(3);
    camera.dispose();
  });

  it('moves slowly while the show runs and reads the meter only every sixth frame', () => {
    const { renderer, scene, readings } = meterRenderer(LOOK);
    const camera = new ShowCamera();
    camera.expose(renderer, frame, 0);
    scene.stops = FULL;
    for (let i = 1; i <= 12; i++) camera.expose(renderer, frame, i / 60);
    expect(readings()).toBe(3);
    expect(camera.stops).toBeLessThan(0);
    expect(camera.stops).toBeGreaterThan(-0.25);
    for (let i = 13; i <= 400; i++) camera.expose(renderer, frame, i / 60);
    expect(camera.stops).toBeCloseTo(-EXPOSURE_RANGE.down, 2);
    expect(renderer.toneMappingExposure).toBeCloseTo(exposureOf(camera.stops), 9);
    camera.dispose();
  });

  it('sets the exposure in every frame, also between two readings: the chain puts the base back before its passes', () => {
    const { renderer, scene } = meterRenderer(FULL);
    const camera = new ShowCamera();
    camera.expose(renderer, frame, 0);
    scene.stops = LOOK;
    renderer.toneMappingExposure = MVR_EXPOSURE;
    camera.expose(renderer, frame, 1 / 60);
    expect(renderer.toneMappingExposure).toBeCloseTo(MVR_EXPOSURE / 2, 9);
    camera.dispose();
  });
});
