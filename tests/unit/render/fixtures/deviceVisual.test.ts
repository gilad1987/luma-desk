/** A `device` fixture (a hoist, a hazer) gets a neutral box and nothing that emits light. */
import { Box3, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { Fixture } from '../../../../src/domain/Fixture';
import { TYPES } from '../../../../src/domain/fixtureTypes';
import { FixtureVisualBuilder } from '../../../../src/render/fixtures';
import { buildFixtureScene } from './buildFixtureScene';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

it('builds a device as a small box with no beam, pool or glow, and registers it for picking', () => {
  stubCanvasDocument();
  const { scene, prims, beam, gobo, models, lensTextures, screenMeshes } = buildFixtureScene();
  const picked: unknown[] = [];
  const picker = { register: (object: unknown) => void picked.push(object) };
  const deps = { scene, prims, beam, gobo, models, lensTextures, screenMesh: screenMeshes, picker };
  const builder = new FixtureVisualBuilder(deps);
  const before = scene.children.length;
  const fixture = new Fixture({ id: 9000, type: 'device', pos: new Vector3(1, 2, 3), mount: 'hang', fixed: null });
  expect(() => builder.assertBuildable(fixture)).not.toThrow();
  const visual = builder.build(fixture);
  expect(visual.kind).toBe('device');
  expect(['beam', 'pool', 'glow', 'lens'].filter((part) => part in visual)).toEqual([]);
  expect(scene.children.length).toBe(before + 1);
  if (visual.kind !== 'device') return;
  expect(picked).toEqual([visual.box]);
  const size = new Box3().setFromObject(visual.g).getSize(new Vector3());
  expect([size.x, size.y, size.z].map((side) => Math.round(side * 100))).toEqual([30, 30, 30]);
  expect(visual.g.position.toArray()).toEqual([1, 2, 3]);
});

it('gives the device type nothing a cue could light', () => {
  expect([TYPES.device.attrs, TYPES.device.power, TYPES.device.moving]).toEqual([[], 0, false]);
  const fixture = new Fixture({ id: 9000, type: 'device', pos: new Vector3(), mount: 'hang', fixed: null });
  expect(fixture.has('dim')).toBe(false);
});
