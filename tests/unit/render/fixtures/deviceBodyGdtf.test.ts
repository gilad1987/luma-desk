/** A device with a GDTF body draws that body, not the grey box, and shows the selection as a light does. */
import { BoxGeometry, Mesh, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { Fixture } from '../../../../src/domain/Fixture';
import { FixtureVisualBuilder, FixtureVisualSync } from '../../../../src/render/fixtures';
import type { FixtureVisualDeps } from '../../../../src/render/fixtures/FixtureVisualDeps';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { builtInSurfaces } from '../builtInSurfaces';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { buildFixtureScene } from './buildFixtureScene';

afterEach(() => vi.unstubAllGlobals());

const hoist = (): Fixture =>
  new Fixture({ id: 9000, type: 'device', pos: new Vector3(1, 2, 3), mount: 'hang', fixed: null });

function build(withBody: boolean) {
  stubCanvasDocument();
  const kit = buildFixtureScene();
  const picked: unknown[] = [];
  const gdtf: FixtureVisualDeps['gdtf'] = {
    modelOf: () => (c) => {
      const mesh = new Mesh(new BoxGeometry(0.4, 0.8, 0.4), c.bodyMat);
      c.pivot.add(mesh);
      return { head: mesh, lens: mesh, lensOff: 0, joints: null, pick: [mesh], axisAt: new Vector3() };
    },
    fitDesk: () => undefined,
    beamRadiusOf: () => undefined,
    drawAfterScenery: () => undefined,
  };
  const picker = { register: (object: unknown) => void picked.push(object) };
  const { scene, prims, beam, gobo, models, lensTextures, screenMeshes } = kit;
  const deps = { scene, prims, beam, gobo, models, lensTextures, screenMesh: screenMeshes, picker };
  const visual = new FixtureVisualBuilder(withBody ? { ...deps, gdtf } : deps).build(hoist());
  return { kit, visual, picked };
}

it('draws the GDTF body of a device and keeps the box only as an invisible pick target', () => {
  const { visual, picked } = build(true);
  if (visual.kind !== 'device') throw new Error('not a device visual');
  expect(visual.box.material.visible).toBe(false);
  const body = visual.g.children[0]?.children[0];
  expect(body instanceof Mesh && body.material === visual.bodyMat).toBe(true);
  expect(picked).toEqual([visual.box, body]);
});

it('shows the grey box when the device has no GDTF body', () => {
  const { visual } = build(false);
  if (visual.kind !== 'device') throw new Error('not a device visual');
  expect(visual.box.material.visible).toBe(true);
});

it('tints a selected device body, and clears the tint when it is not selected', () => {
  const { kit, visual } = build(true);
  if (visual.kind !== 'device') throw new Error('not a device visual');
  let selected = true;
  const sync = new FixtureVisualSync({
    selection: { has: (id) => selected && id === 9000 },
    beamTime: kit.beam.time,
    goboTextures: kit.gobo.textures,
    lights: new LightFrame(),
    surface: builtInSurfaces(),
  });
  sync.setVisuals([visual], new Map());
  sync.update(1, 0.016, new Vector3());
  expect(visual.bodyMat.emissive.getHex()).toBe(0x7a5a00);
  selected = false;
  sync.update(2, 0.016, new Vector3());
  expect(visual.bodyMat.emissive.getHex()).toBe(0);
});
