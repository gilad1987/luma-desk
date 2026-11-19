/**
 * One audience layer: a person sits on the drawn proxy seat, not near it, and the near level of detail goes only to
 * the people close to the camera.
 */
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, expect, it } from 'vitest';
import { proxyGeometry } from '../../../../../src/render/mvr/proxiesShapes.ts';
import { addAudience, setAudience } from '../../../../../src/render/venue/audience/addAudience.ts';
import { AudienceLayer } from '../../../../../src/render/venue/audience/AudienceLayer.ts';
import { AUDIENCE_GROUP } from '../../../../../src/render/venue/audience/figureSlot.ts';
import { SEAT_TOP } from '../../../../../src/render/venue/audience/legs.ts';
import { SEAT_BACK } from '../../../../../src/render/venue/audience/people.ts';
import { drawn, figureMeshes, freeStages, PITCH, seatStage } from './seatStage.ts';

afterEach(freeStages);

const rounded = (value: number): number => Math.round(value * 1000) / 1000;

it('takes seat height and seat back from the proxy seat shape', () => {
  const seat = Array.from(proxyGeometry('seat').getAttribute('position').array);
  const heights = seat.filter((_, i) => i % 3 === 1).map(rounded);
  const depths = seat.filter((_, i) => i % 3 === 2).map(rounded);
  expect([heights.includes(SEAT_TOP), depths.includes(SEAT_BACK)]).toEqual([true, true]);
});

it('sits a person on the proxy seat: hips on the seat top, back at the seat back', () => {
  const root = seatStage(1);
  addAudience(root);
  setAudience({ shown: true, occupancy: 1 });
  root.updateMatrixWorld();
  const person = figureMeshes(root).find((mesh) => mesh.count === 1);
  const matrix = new Matrix4();
  person?.getMatrixAt(0, matrix);
  const [at, size] = [new Vector3().setFromMatrixPosition(matrix), new Vector3().setFromMatrixScale(matrix)];
  expect(at.toArray().map(rounded)).toEqual([0, rounded(0.2 + SEAT_TOP), rounded(3 + SEAT_BACK * PITCH)]);
  expect([size.x > 0.96, size.x < 1.04, Math.abs(size.y - size.x) < 1e-6]).toEqual([true, true, true]);
});

it('gives the near level only to the people close to the camera', () => {
  const root = seatStage(200);
  addAudience(root);
  expect([drawn(root, 'near'), drawn(root, 'far')]).toEqual([0, 170]);
  const camera = new PerspectiveCamera();
  camera.position.set(0, 2, 6);
  camera.updateMatrixWorld();
  const layer = root.getObjectByName(AUDIENCE_GROUP);
  if (layer instanceof AudienceLayer) layer.see(camera);
  root.updateMatrixWorld();
  expect([drawn(root, 'near') > 10, drawn(root, 'near') < 40, drawn(root)]).toEqual([true, true, 170]);
});
