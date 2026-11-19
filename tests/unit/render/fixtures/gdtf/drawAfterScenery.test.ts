import { CircleGeometry, Group, Mesh } from 'three';
import { expect, it, vi } from 'vitest';
import { gdtfBodySource } from '../../../../../src/render/fixtures/gdtf/index.ts';

it('draws every mesh of a fixture body after the scenery, whatever order their materials were made in', () => {
  const library = {
    protoOf: () => undefined,
    boxOf: () => undefined,
    note: vi.fn(),
    beamRadiusOf: () => undefined,
    lens: new CircleGeometry(),
  };
  const body = new Group();
  const yoke = new Group();
  const meshes = [new Mesh(), new Mesh(), new Mesh()];
  body.add(meshes[0] ?? yoke, yoke);
  yoke.add(...meshes.slice(1));
  gdtfBodySource(library, () => undefined).drawAfterScenery(body);
  expect(meshes.map((mesh) => mesh.renderOrder)).toEqual([1, 1, 1]);
  // a group keeps its order: a group's order would also move the blended parts added to it later
  expect([body.renderOrder, yoke.renderOrder]).toEqual([0, 0]);
});
