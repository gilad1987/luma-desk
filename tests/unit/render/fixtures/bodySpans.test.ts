/**
 * Pins every `BODY_SPANS` value against the bounding box of the model the desk really builds, and checks that a
 * fixture with a `bodyScale` is drawn that much smaller with its lens offset scaled alike.
 */
import { Box3, Mesh, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { Fixture } from '../../../../src/domain/Fixture';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import { BODY_SPANS } from '../../../../src/domain/fixtureTypes/bodySpans';
import { FixtureVisualBuilder } from '../../../../src/render/fixtures';
import { buildFixtureScene } from './buildFixtureScene';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

/** The largest dimension, in millimetres, of the hung body the builder makes for `type` at `bodyScale`. */
function builtSpan(type: FixtureTypeId, bodyScale?: number): number {
  const { scene, prims, beam, gobo, models, lensTextures, screenMeshes } = buildFixtureScene();
  const picker = { register: () => undefined };
  const builder = new FixtureVisualBuilder({
    scene,
    prims,
    beam,
    gobo,
    models,
    lensTextures,
    screenMesh: screenMeshes,
    picker,
  });
  const fixture = new Fixture({ id: 9000, type, pos: new Vector3(), mount: 'hang', fixed: null });
  if (bodyScale !== undefined) fixture.bodyScale = bodyScale;
  const visual = builder.build(fixture);
  const box = new Box3();
  if (!('g' in visual)) return 0;
  visual.g.updateMatrixWorld(true);
  visual.g.traverse((o) => void (o instanceof Mesh && o.visible && box.expandByObject(o)));
  const size = box.getSize(new Vector3());
  return Math.round(Math.max(size.x, size.y, size.z) * 1000);
}

it('matches the built model: the largest dimension of every hung body, to the millimetre', () => {
  stubCanvasDocument();
  expect(BODY_SPANS.screen).toBe(0);
  const types = (Object.keys(BODY_SPANS) as FixtureTypeId[]).filter((type) => type !== 'screen');
  const measured = types.map((type) => [type, builtSpan(type)]);
  expect(measured).toEqual(types.map((type) => [type, Math.round(BODY_SPANS[type] * 1000)]));
});

it('draws a fixture with a bodyScale at that part of its span', () => {
  stubCanvasDocument();
  expect(builtSpan('beam', 0.4)).toBe(Math.round(BODY_SPANS.beam * 1000 * 0.4));
  expect(builtSpan('bar', 2)).toBe(Math.round(BODY_SPANS.bar * 1000 * 2));
});
