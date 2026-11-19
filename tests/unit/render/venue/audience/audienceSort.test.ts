/**
 * The cost of the audience sort: a camera that moves without taking a person over the near limit uploads no buffer,
 * one mesh of a layer notes the camera, and the shared material and the layer are freed once.
 */
import { Material, PerspectiveCamera } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { addAudience } from '../../../../../src/render/venue/audience/addAudience.ts';
import { AudienceLayer } from '../../../../../src/render/venue/audience/AudienceLayer.ts';
import { AUDIENCE_GROUP } from '../../../../../src/render/venue/audience/figureSlot.ts';
import { drawn, figureMeshes, freeStages, seatStage } from './seatStage.ts';

afterEach(freeStages);

function look(root: ReturnType<typeof seatStage>, x: number, y: number, z: number): void {
  const camera = new PerspectiveCamera();
  camera.position.set(x, y, z);
  camera.updateMatrixWorld();
  const layer = root.getObjectByName(AUDIENCE_GROUP);
  if (!(layer instanceof AudienceLayer)) throw new Error('no audience layer');
  layer.see(camera);
  root.updateMatrixWorld();
}

it('uploads no buffer when the camera moves and no person changes level', () => {
  const root = seatStage(200);
  addAudience(root);
  look(root, 0, 400, 0);
  const versions = (): number[] =>
    figureMeshes(root).flatMap((mesh) => [mesh.instanceMatrix.version, mesh.instanceColor?.version ?? -1]);
  const before = versions();
  // 30 m further, still far from every seat: the sort runs (more than 1 m) and finds every level as it was
  look(root, 30, 400, 0);
  expect(versions()).toEqual(before);
  expect(drawn(root, 'near')).toBe(0);
  // next to the seats: people change to the near level, so the buffers are copied and uploaded again
  look(root, 0, 2, 6);
  expect(drawn(root, 'near')).toBeGreaterThan(10);
  expect(versions().every((version, i) => version > (before[i] ?? 0))).toBe(true);
  expect(drawn(root)).toBe(170);
});

it('notes the camera from one mesh of a layer', () => {
  const root = seatStage(20);
  addAudience(root);
  // a mesh without the hook keeps the empty method of its prototype
  const hooked = figureMeshes(root).map((mesh) => Object.hasOwn(mesh, 'onBeforeRender'));
  expect(hooked.length).toBeGreaterThan(2);
  expect(hooked.filter(Boolean)).toHaveLength(1);
  expect(hooked[0]).toBe(true);
});

it('frees the shared material and the layer once, however many meshes are disposed', () => {
  const root = seatStage(20);
  addAudience(root);
  const meshes = figureMeshes(root);
  const material = meshes[0]?.material;
  if (!(material instanceof Material)) throw new Error('no shared material');
  const freed = vi.fn();
  material.addEventListener('dispose', freed);
  for (const mesh of meshes) mesh.dispose();
  expect(meshes.length).toBeGreaterThan(2);
  expect(freed).toHaveBeenCalledTimes(1);
});
