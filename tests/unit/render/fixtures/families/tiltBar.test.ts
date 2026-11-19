/**
 * Owns the shape of a built `tiltBar` product: the TetraX is a light with yoke and tilt joints and a flat lens drawn
 * at its body's lens aspect, and the app's pose sync pans its yoke (its `wash` base is not tilt-only) while its base
 * stays still. The lazy
 * creation rule is owned by `lazyProducts.test.ts`, the pinned sizes by `productSpans.test.ts`.
 */
import { Mesh, Quaternion, Vector3, type Object3D } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { D2R } from '../../../../../src/core';
import { PRODUCTS } from '../../../../../src/domain/fixtureProducts';
import type { LightVisual } from '../../../../../src/render/fixtures';
import { syncPose } from '../../../../../src/render/fixtures/sync/syncPose';
import { stubCanvasDocument } from '../../stubCanvasDocument';
import { visualBuilder } from '../builtBox';

afterEach(() => vi.unstubAllGlobals());

const TETRAX = PRODUCTS['robe-tetrax'];

function buildTetraX(): LightVisual {
  stubCanvasDocument();
  const visual = visualBuilder()({ type: TETRAX.base, product: 'robe-tetrax' });
  if (visual.kind !== 'light') throw new Error('a TetraX builds a light visual');
  return visual;
}

it('builds the TetraX as a light with joints and a flat lens at the body lens aspect', () => {
  const visual = buildTetraX();
  const { x, y } = visual.lens.scale;
  expect([visual.joints === null, visual.lens.material === visual.lensMat]).toStrictEqual([false, true]);
  expect(x / y).toBeCloseTo(TETRAX.body.lens.w / TETRAX.body.lens.h, 6);
});

it('pans the TetraX yoke through the pose sync, because its wash base is not tilt-only', () => {
  const visual = buildTetraX();
  syncPose(visual, { pan: 30, tilt: 0, grot: 0 }, 100, new Vector3());
  expect(visual.joints?.yoke.rotation.y).not.toBe(0);
});

it('keeps the TetraX base still under a pan, so only the yoke turns', () => {
  const visual = buildTetraX();
  // the first mesh in the fixture tree is the base body (`tiltBarFamily.ts` builds it before the yoke)
  let base: Mesh | undefined;
  visual.g.traverse((o) => void (base ??= o instanceof Mesh ? o : undefined));
  syncPose(visual, { pan: 30, tilt: 45, grot: 0 }, 100, new Vector3());
  visual.g.updateMatrixWorld(true);
  const turn = (o: Object3D | undefined): number[] | undefined => o?.getWorldQuaternion(new Quaternion()).toArray();
  expect([turn(base), visual.joints?.yoke.rotation.y]).toStrictEqual([[0, 0, 0, 1], 30 * D2R]);
});
