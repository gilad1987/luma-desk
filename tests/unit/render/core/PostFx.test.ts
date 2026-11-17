import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Scene, Vector2, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { PostFx } from '../../../../src/render/PostFx';

const fakeRenderer = {
  getPixelRatio: () => 1,
  getSize: (target: Vector2) => target.set(640, 360),
} as unknown as WebGLRenderer;

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
