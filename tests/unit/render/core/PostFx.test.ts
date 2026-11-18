/**
 * PostFx sizing and render forwarding with a fake renderer. The bloom look is owned by the screenshot suite.
 */
import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostFx } from '../../../../src/render/stage/PostFx';

/** A real WebGLRenderer prototype with no GL context behind it; EffectComposer only reads its size and ratio. */
const fakeRenderer: WebGLRenderer = Object.assign(Object.create(WebGLRenderer.prototype) as WebGLRenderer, {
  getPixelRatio: () => 1,
  getSize: (target: Vector2) => target.set(640, 360),
});

afterEach(() => vi.restoreAllMocks());

describe('PostFx', () => {
  it('resizes the composer at full size and the bloom at half size', () => {
    const composerSize = vi.spyOn(EffectComposer.prototype, 'setSize');
    const bloomSize = vi.spyOn(UnrealBloomPass.prototype, 'setSize');
    const fx = new PostFx(fakeRenderer, new Scene(), new PerspectiveCamera());
    bloomSize.mockClear();
    fx.setSize(800, 400);
    expect(composerSize).toHaveBeenCalledWith(800, 400);
    expect(bloomSize).toHaveBeenLastCalledWith(400, 200);
  });

  it('renders through the composer', () => {
    const render = vi.spyOn(EffectComposer.prototype, 'render').mockImplementation(() => undefined);
    new PostFx(fakeRenderer, new Scene(), new PerspectiveCamera()).render();
    expect(render).toHaveBeenCalledTimes(1);
  });
});
