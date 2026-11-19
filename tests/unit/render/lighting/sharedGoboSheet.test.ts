import { DepthTexture, PerspectiveCamera, Scene, Texture } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beamVolume } from '../../../../src/render/beams/beamVolume';
import { createBeamPass, goboSheetOf } from '../../../../src/render/beams/createBeamPass';
import { createSurfaceLightPass } from '../../../../src/render/lighting/createSurfaceLightPass';
import { surfaceLight } from '../../../../src/render/lighting/surfaceLight';
import { stubCanvasDocument } from '../stubCanvasDocument';

/** The contexts of one chain: an object per pass, as the post chain makes them, with the one scene depth. */
function chain() {
  const sceneDepth = { texture: new DepthTexture(1, 1) };
  const occlusion = new Texture();
  const context = () => ({ camera: new PerspectiveCamera(), scene: new Scene(), sceneDepth, occlusion });
  return { sceneDepth, context };
}

beforeEach(stubCanvasDocument);
afterEach(() => {
  vi.unstubAllGlobals();
  surfaceLight.batch = undefined;
  beamVolume.batch = undefined;
});

describe('the gobo sheet of a post chain', () => {
  it('is one texture for the surface light and the beams, and is freed once, by the beam pass', () => {
    const { sceneDepth, context } = chain();
    const light = createSurfaceLightPass(context());
    const sheet = goboSheetOf({ sceneDepth });
    const beams = createBeamPass(context());
    expect(goboSheetOf({ sceneDepth })).toBe(sheet);
    const freed = vi.fn();
    sheet.addEventListener('dispose', freed);
    light.dispose();
    expect(freed).not.toHaveBeenCalled();
    beams.dispose();
    expect(freed).toHaveBeenCalledTimes(1);
  });

  it('is a new texture for another chain, and for the same scene depth after the sheet was freed', () => {
    const { sceneDepth, context } = chain();
    const sheet = goboSheetOf({ sceneDepth });
    expect(goboSheetOf(chain())).not.toBe(sheet);
    createBeamPass(context()).dispose();
    expect(goboSheetOf({ sceneDepth })).not.toBe(sheet);
  });
});
