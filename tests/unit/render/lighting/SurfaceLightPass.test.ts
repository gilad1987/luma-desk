import { DepthTexture, PerspectiveCamera, Scene, Texture, WebGLRenderTarget } from 'three';
import type { WebGLRenderer } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBeamPass } from '../../../../src/render/beams/createBeamPass';
import { createSurfaceLightPass } from '../../../../src/render/lighting/createSurfaceLightPass';
import { LightBatch } from '../../../../src/render/lighting/LightBatch';
import { surfaceLight } from '../../../../src/render/lighting/surfaceLight';
import { SurfaceLightPass } from '../../../../src/render/lighting/SurfaceLightPass';
import { PRE_BLOOM } from '../../../../src/render/post/preBloom';

function createPass(goboSheet = new Texture(), ownsSheet = true): [SurfaceLightPass, LightBatch] {
  const context = {
    camera: new PerspectiveCamera(),
    scene: new Scene(),
    sceneDepth: { texture: new DepthTexture(1, 1) },
    occlusion: new Texture(),
  };
  const rows = new LightBatch();
  return [new SurfaceLightPass(context, { rows, goboSheet, ownsSheet }), rows];
}

/** Draws one frame with no lit fixture: the pass must not touch the renderer, so two spies are enough. */
function draw(pass: SurfaceLightPass): { render: ReturnType<typeof vi.fn>; setRenderTarget: ReturnType<typeof vi.fn> } {
  const renderer = { render: vi.fn(), setRenderTarget: vi.fn() };
  const buffer = new WebGLRenderTarget(1, 1);
  pass.render(renderer as unknown as WebGLRenderer, buffer, buffer);
  return renderer;
}

afterEach(() => {
  surfaceLight.batch = undefined;
  surfaceLight.isEnabled = true;
});

describe('the surface light pass', () => {
  it('is drawn before the beams, so a shaft is in front of its pool', () => {
    expect(PRE_BLOOM).toEqual([createSurfaceLightPass, createBeamPass]);
  });

  it('adds to the read buffer, never swaps, and draws nothing while no fixture is lit', () => {
    const [pass] = createPass();
    expect(pass.needsSwap).toBe(false);
    const renderer = draw(pass);
    expect(renderer.render).not.toHaveBeenCalled();
    expect(renderer.setRenderTarget).not.toHaveBeenCalled();
    pass.dispose();
  });

  it('takes the lights of the fixture sync when it draws and gives them back when it is freed', () => {
    const [pass, rows] = createPass();
    expect(surfaceLight.batch).toBeUndefined();
    draw(pass);
    expect(surfaceLight.batch).toBe(rows);
    pass.dispose();
    expect(surfaceLight.batch).toBeUndefined();
  });

  it('leaves the lights with the pass in use when a pass that never drew is freed', () => {
    const [inUse, rows] = createPass();
    draw(inUse);
    createPass()[0].dispose();
    expect(surfaceLight.batch).toBe(rows);
    inUse.dispose();
  });

  it('frees the gobo sheet it owns and leaves a sheet it was lent', () => {
    const own = new Texture();
    const lent = new Texture();
    const onDispose = vi.fn();
    own.addEventListener('dispose', onDispose);
    lent.addEventListener('dispose', onDispose);
    createPass(lent, false)[0].dispose();
    expect(onDispose).not.toHaveBeenCalled();
    createPass(own)[0].dispose();
    expect(onDispose).toHaveBeenCalledTimes(1);
  });
});
