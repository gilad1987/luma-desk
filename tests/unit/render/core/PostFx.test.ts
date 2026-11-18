/**
 * PostFx sizing and render forwarding with a fake renderer. The bloom look is owned by the screenshot suite.
 */
import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostFx } from '../../../../src/render/stage/PostFx';
import { fakeMvrChain as fakeChain } from '../post/fakeMvrChain';

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

  it('draws a built-in stage through the legacy composer and creates no MVR chain', () => {
    const render = vi.spyOn(EffectComposer.prototype, 'render').mockImplementation(() => undefined);
    const create = vi.fn(() => Promise.resolve(fakeChain()));
    const fx = new PostFx(fakeRenderer, new Scene(), new PerspectiveCamera(), create);
    expect(fx.selectChain()).toBe(false);
    fx.render();
    expect(create).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
    expect(fx.sceneDepth).toBeUndefined();
  });

  it('draws an MVR stage through the MVR chain in both glow states and frees it on a stage change', async () => {
    const composerRender = vi.spyOn(EffectComposer.prototype, 'render').mockImplementation(() => undefined);
    const chain = fakeChain();
    let isMvrShown = true;
    const fx = new PostFx(fakeRenderer, new Scene(), new PerspectiveCamera(), () => Promise.resolve(chain));
    fx.followMvr(() => isMvrShown);
    fx.setSize(800, 400);
    expect(fx.selectChain()).toBe(false); // the chain still loads, so this frame is a built-in frame
    await Promise.resolve();
    expect(fx.selectChain()).toBe(true);
    fx.render(false);
    fx.render(true);
    expect(chain.setSize).toHaveBeenCalledWith(800, 400);
    expect(chain.render.mock.calls).toEqual([[false], [true]]);
    expect(composerRender).not.toHaveBeenCalled();
    expect(fx.sceneDepth).toBe(chain.sceneDepth);
    isMvrShown = false;
    expect(fx.selectChain()).toBe(false);
    expect(chain.dispose).toHaveBeenCalledTimes(1);
    expect(fx.sceneDepth).toBeUndefined();
    fx.render();
    expect(composerRender).toHaveBeenCalledTimes(1);
  });
});
