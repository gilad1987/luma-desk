/**
 * The audience sorts its levels of detail for the viewer only: the lamp of a shadow map draws the figures too, and a
 * sort for it, then one for the viewer, moved people between the levels in each frame.
 */
import { PerspectiveCamera, Scene, type Camera, type WebGLRenderer } from 'three';
import { afterEach, expect, it } from 'vitest';
import { ROW } from '../../../../../src/render/beams/packBeam.ts';
import { KEYS } from '../../../../../src/render/lighting/KeyShadows.ts';
import { ShadowAtlas } from '../../../../../src/render/lighting/ShadowAtlas.ts';
import { addAudience } from '../../../../../src/render/venue/audience/addAudience.ts';
import { AudienceLayer } from '../../../../../src/render/venue/audience/AudienceLayer.ts';
import { AUDIENCE_GROUP } from '../../../../../src/render/venue/audience/figureSlot.ts';
import { drawn, figureMeshes, freeStages, seatStage } from './seatStage.ts';

afterEach(freeStages);

/** The camera the shadow atlas draws a tile with, from a renderer that only records it. */
function lampCamera(): Camera {
  let lamp: Camera | undefined;
  const renderer = { setRenderTarget: () => undefined, render: (_: Scene, camera: Camera) => (lamp = camera) };
  const atlas = new ShadowAtlas();
  atlas.draw(renderer as unknown as WebGLRenderer, new Scene(), 0, new Float32Array(KEYS * ROW));
  atlas.dispose();
  if (!lamp) throw new Error('the atlas drew no tile');
  return lamp;
}

it('keeps the levels the viewer sees when the lamp of a shadow map draws the audience', () => {
  const root = seatStage(200);
  addAudience(root);
  const layer = root.getObjectByName(AUDIENCE_GROUP);
  if (!(layer instanceof AudienceLayer)) throw new Error('no audience layer');
  const viewer = new PerspectiveCamera();
  viewer.position.set(0, 2, 6);
  viewer.updateMatrixWorld();
  layer.see(viewer);
  root.updateMatrixWorld();
  const near = drawn(root, 'near');
  const versions = figureMeshes(root).map((mesh) => mesh.instanceMatrix.version);
  expect(near).toBeGreaterThan(10);
  // a lamp far from every seat: as an eye it would put every person on the far level
  const lamp = lampCamera();
  lamp.position.set(0, 30, 80);
  lamp.updateMatrixWorld();
  layer.see(lamp);
  root.updateMatrixWorld();
  expect(drawn(root, 'near')).toBe(near);
  expect(figureMeshes(root).map((mesh) => mesh.instanceMatrix.version)).toEqual(versions);
});
