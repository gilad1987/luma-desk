/** Pins every `MOUNT_HEIGHTS` value against the bounding box of the model the desk really builds. */
import { Box3, Mesh, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { Fixture, type Mount } from '../../../../src/domain/Fixture';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import { MOUNT_HEIGHTS } from '../../../../src/domain/fixtureTypes/mountHeights';
import { FixtureVisualBuilder } from '../../../../src/render/fixtures';
import { buildFixtureScene } from './buildFixtureScene';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

it('matches the built model: top of the hung body and bottom of the floor body, to the millimetre', () => {
  stubCanvasDocument();
  const { scene, prims, beam, gobo, models, lensTextures, screenMeshes } = buildFixtureScene();
  const picker = { register: () => undefined };
  const deps = { scene, prims, beam, gobo, models, lensTextures, screenMesh: screenMeshes, picker };
  const builder = new FixtureVisualBuilder(deps);
  const span = (type: FixtureTypeId, mount: Mount): Box3 => {
    const visual = builder.build(new Fixture({ id: 9000, type, pos: new Vector3(), mount, fixed: null }));
    const box = new Box3();
    if (!('g' in visual)) return box.setFromCenterAndSize(new Vector3(), new Vector3());
    visual.g.updateMatrixWorld(true);
    visual.g.traverse((o) => void (o instanceof Mesh && o.visible && box.expandByObject(o)));
    return box;
  };
  // the screen has no model: the venue draws it, so its origin is its mounting point
  expect(MOUNT_HEIGHTS.screen).toEqual({ hang: 0, floor: 0 });
  const types = (Object.keys(MOUNT_HEIGHTS) as FixtureTypeId[]).filter((type) => type !== 'screen');
  const mm = (value: number): number => Math.round(value * 1000);
  const measured = types.map((type) => [type, mm(span(type, 'hang').max.y), mm(-span(type, 'floor').min.y)]);
  const pinned = types.map((type) => [type, mm(MOUNT_HEIGHTS[type].hang), mm(MOUNT_HEIGHTS[type].floor)]);
  expect(measured).toEqual(pinned);
});
