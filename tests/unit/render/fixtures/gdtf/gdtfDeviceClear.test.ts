/**
 * Taking the GDTF source away rebuilds a rig whose only GDTF body is on a device (a hoist, a hazer), as it does for a
 * light: the source frees the body's geometry, so the device must go back to its box. A rig that drew nothing from
 * the source keeps its visuals.
 */
import { BoxGeometry, CircleGeometry, Matrix4, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { Fixture } from '../../../../../src/domain/Fixture';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { buildProto } from '../../../../../src/render/fixtures/gdtf/buildProto';
import { gdtfBodySource } from '../../../../../src/render/fixtures/gdtf/index.ts';
import type { PartGeometry } from '../../../../../src/render/fixtures/gdtf/walkTree';
import { setupFixtureVisuals } from '../fixtureVisualsSetup';

const at = (z: number): Float64Array => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);
const root: GdtfNode = {
  ...{ name: 'Body', type: 'Geometry', tag: 'Geometry', position: at(0), role: 'fixed', children: [] },
  model: { name: 'B', file: '', details: [], size: [0.3, 0.3, 0.3], primitiveType: 'Undefined' },
};
const boxes: PartGeometry = (part) => {
  const [length, width, height] = part.model?.size ?? [0, 0, 0];
  return { geometry: new BoxGeometry(length, height, width), matrix: new Matrix4() };
};
const hoist = new Fixture({ id: 9000, type: 'device', pos: new Vector3(1, 2, 3), mount: 'hang', fixed: null });

function deviceRig() {
  const setup = setupFixtureVisuals(BUILT_IN_DESIGN);
  setup.visuals.rebuild([hoist], new Map());
  const proto = buildProto(root, [0, 0, 0], boxes, true);
  const quiet = { boxOf: () => undefined, note: vi.fn(), beamRadiusOf: () => undefined };
  const library = { ...quiet, protoOf: () => proto, lens: new CircleGeometry(1, 8) };
  return { ...setup, source: gdtfBodySource(library, () => ({ uuid: 'U' })) };
}

it('rebuilds a device-only rig with its box when the GDTF source is taken away', () => {
  const { visuals, scene, source } = deviceRig();
  visuals.setGdtf(source);
  const real = visuals.visuals[0];
  if (real?.kind !== 'device') throw new Error('not a device visual');
  expect(real.pick.length).toBeGreaterThan(0);
  visuals.setGdtf(undefined);
  const box = visuals.visuals[0];
  if (box?.kind !== 'device') throw new Error('not a device visual');
  expect([box === real, box.pick.length, box.box.material === box.bodyMat]).toEqual([false, 0, true]);
  expect(scene.children.includes(real.g)).toBe(false);
});

it('keeps the visuals of a device rig that drew nothing from the source', () => {
  const { visuals } = deviceRig();
  const before = visuals.visuals[0];
  visuals.setGdtf(undefined);
  expect(visuals.visuals[0]).toBe(before);
});
