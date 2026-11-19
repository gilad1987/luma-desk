import {
  BoxGeometry,
  DynamicDrawUsage,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
} from 'three';
import { ROW } from './packBeam';

const ATTRIBUTES = ['iOrigin', 'iAxis', 'iColor', 'iGobo'] as const;

/** A box around the unit beam (x and y in -1..1, z in 0..1) that is drawn once per row of `data`. */
export function createBeamGeometry(data: Float32Array): [InstancedBufferGeometry, InstancedInterleavedBuffer] {
  const box = new BoxGeometry(2, 2, 1).translate(0, 0, 0.5);
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(box.getIndex());
  geometry.setAttribute('position', box.getAttribute('position'));
  const buffer = new InstancedInterleavedBuffer(data, ROW).setUsage(DynamicDrawUsage);
  ATTRIBUTES.forEach((name, i) => geometry.setAttribute(name, new InterleavedBufferAttribute(buffer, 4, i * 4)));
  return [geometry, buffer];
}
