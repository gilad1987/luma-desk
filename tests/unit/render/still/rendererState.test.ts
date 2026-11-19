import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { saveRendererState } from '../../../../src/render/still/rendererState';
import { changeEverything, FakeRenderer, snapshot } from './fakeRenderer';

describe('saveRendererState', () => {
  it('gives back every field a still render changes', () => {
    const renderer = new FakeRenderer();
    const camera = new PerspectiveCamera(40, 4 / 3, 0.1, 100);
    camera.position.set(0, 1, 5);
    const before = snapshot(renderer, camera);
    const restore = saveRendererState(renderer, camera);
    changeEverything(renderer, camera);
    restore();
    expect(snapshot(renderer, camera)).toEqual(before);
    expect(camera.view).toBeNull();
    expect(renderer.ratioSets).toBe(0);
  });

  it('keeps an existing view offset and resets a changed pixel ratio', () => {
    const renderer = new FakeRenderer();
    const camera = new PerspectiveCamera(40, 2, 0.1, 100);
    camera.setViewOffset(1000, 500, 10, 20, 300, 200);
    const before = snapshot(renderer, camera);
    const restore = saveRendererState(renderer, camera);
    camera.setViewOffset(7680, 4320, 0, 0, 1920, 1080);
    renderer.setPixelRatio(1);
    restore();
    expect(snapshot(renderer, camera)).toEqual(before);
    expect(renderer.ratioSets).toBe(2);
  });
});
