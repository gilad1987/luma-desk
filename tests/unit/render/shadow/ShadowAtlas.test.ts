import { Matrix4, PerspectiveCamera, Scene, WebGLRenderTarget, type WebGLRenderer } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShadowAtlas } from '../../../../src/render/shadow/ShadowAtlas';
import { SHADOW_DEFAULTS } from '../../../../src/render/shadow/shadowConfig';
import { beamRows } from './shadowRows';

/** A renderer that draws nothing and counts 100 triangles per render. */
function fakeRenderer() {
  const info = { render: { triangles: 0 } };
  const calls = { render: vi.fn(() => void (info.render.triangles += 100)), clear: vi.fn(), setRenderTarget: vi.fn() };
  const renderer = { ...calls, info, autoClear: true, getRenderTarget: () => null };
  // the atlas uses these members only; a WebGL context does not exist in a unit test
  return { renderer: renderer as unknown as WebGLRenderer, calls };
}

function viewProjection(): number[] {
  const camera = new PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 4, 20);
  camera.lookAt(0, 4, 0);
  camera.updateMatrixWorld();
  return new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;
}

/**
 * The clock is frozen unless a test passes its own: with `performance.now` a loaded full-suite run went over the
 * update's time budget after one tile, and a test that counts draws saw 1 in place of 3.
 */
function setup(now: () => number = () => 0) {
  const { renderer, calls } = fakeRenderer();
  const casters = { scene: new Scene(), invRange: { value: 1 }, epoch: 1, sync: vi.fn(), cull: vi.fn() };
  const atlas = new ShadowAtlas(renderer, casters, () => Infinity, { now });
  return { atlas, calls, casters, renderer };
}

afterEach(() => vi.restoreAllMocks());

describe('ShadowAtlas', () => {
  it('draws the tiles of a static look once, with the range of each beam, and then nothing', () => {
    const { atlas, calls, casters, renderer } = setup();
    const rows = beamRows(3);
    atlas.update(rows, 3, viewProjection());
    expect(atlas.stats.draws).toBe(3);
    expect([...atlas.stats.triangles.subarray(0, 3)]).toEqual([100, 100, 100]);
    expect([...atlas.tileOf.subarray(0, 3)].sort()).toEqual([0, 1, 2]);
    // range 8.5: the beam is 8 m long and its apex 0.5 m behind the lens
    expect(casters.invRange.value).toBeCloseTo(1 / 8.5, 6);
    expect(atlas.maps.depth[0]).toBeCloseTo(1 / 8.5, 6);
    expect(atlas.maps.depth[1]).toBeCloseTo(SHADOW_DEFAULTS.bias / 8.5, 6);
    expect(calls.setRenderTarget).toHaveBeenLastCalledWith(null);
    expect(renderer.autoClear).toBe(true);
    atlas.update(rows, 3, viewProjection());
    expect(atlas.stats.draws).toBe(0);
    expect(calls.render).toHaveBeenCalledTimes(3);
    // the casters are culled for each tile, before its draw
    expect(casters.cull).toHaveBeenCalledTimes(3);
    expect(casters.sync).toHaveBeenCalledTimes(2);
  });

  it('starts no further tile once the update is over its time, and draws the rest in the next frame', () => {
    let time = 0;
    const { atlas, calls } = setup(() => (time += 5));
    const rows = beamRows(3);
    atlas.update(rows, 3, viewProjection());
    expect(atlas.stats.draws).toBe(1);
    expect([...atlas.tileOf.subarray(0, 3)].filter((tile) => tile >= 0)).toHaveLength(1);
    atlas.update(rows, 3, viewProjection());
    expect(calls.render).toHaveBeenCalledTimes(2);
  });

  it('frees its render target', () => {
    const dispose = vi.spyOn(WebGLRenderTarget.prototype, 'dispose');
    const { atlas } = setup();
    atlas.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
