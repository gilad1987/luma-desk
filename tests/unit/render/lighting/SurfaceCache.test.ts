import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { DRAW, MAX_AGE, SurfaceCache } from '../../../../src/render/lighting/SurfaceCache';

const SIZE = { width: 1280, height: 720 };

function setUp(): { cache: SurfaceCache; camera: PerspectiveCamera } {
  const camera = new PerspectiveCamera();
  camera.updateMatrixWorld();
  const cache = new SurfaceCache();
  expect(cache.plan(camera, SIZE, 7, false)).toBe(DRAW.buffers);
  return { cache, camera };
}

describe('SurfaceCache', () => {
  it('draws nothing while the camera, the size and the scene are at rest', () => {
    const { cache, camera } = setUp();
    for (let frame = 0; frame < 20; frame++) expect(cache.plan(camera, SIZE, 7, false)).toBe(DRAW.none);
  });

  it('draws the buffers at once, frame after frame, when the camera moves or the size changes', () => {
    const { cache, camera } = setUp();
    for (let frame = 0; frame < 4; frame++) {
      camera.position.x += 1;
      camera.updateMatrixWorld();
      // a shadow map waits while the camera moves
      expect(cache.plan(camera, SIZE, 7, true)).toBe(DRAW.buffers);
    }
    expect(cache.plan(camera, { width: 640, height: 720 }, 7, false)).toBe(DRAW.buffers);
    camera.fov = 30;
    camera.updateProjectionMatrix();
    expect(cache.plan(camera, { width: 640, height: 720 }, 7, false)).toBe(DRAW.buffers);
    expect(cache.plan(camera, { width: 640, height: 720 }, 7, false)).toBe(DRAW.none);
  });

  it('draws the buffers every second frame at most while only the scene moves', () => {
    const { cache, camera } = setUp();
    const draws: number[] = [];
    for (let stamp = 8; stamp < 14; stamp++) draws.push(cache.plan(camera, SIZE, stamp, false));
    expect(draws).toEqual([DRAW.none, DRAW.buffers, DRAW.none, DRAW.buffers, DRAW.none, DRAW.buffers]);
    // the move ended one frame after the last draw: the buffers catch up, then rest
    expect(cache.plan(camera, SIZE, 13, false)).toBe(DRAW.none);
    expect(cache.plan(camera, SIZE, 14, false)).toBe(DRAW.buffers);
    expect(cache.plan(camera, SIZE, 14, false)).toBe(DRAW.none);
  });

  it('gives a frame one draw of the scenery at most: the buffers and the shadow maps take turns', () => {
    const { cache, camera } = setUp();
    const draws: number[] = [];
    for (let stamp = 8; stamp < 14; stamp++) draws.push(cache.plan(camera, SIZE, stamp, true));
    expect(draws).toEqual([DRAW.tile, DRAW.buffers, DRAW.tile, DRAW.buffers, DRAW.tile, DRAW.buffers]);
    // at rest again, the maps that are out of date get every frame
    expect(cache.plan(camera, SIZE, 13, true)).toBe(DRAW.tile);
    expect(cache.plan(camera, SIZE, 13, true)).toBe(DRAW.tile);
    expect(cache.plan(camera, SIZE, 13, false)).toBe(DRAW.none);
  });

  it('never uses a draw of the buffers for more than its longest age', () => {
    const { cache, camera } = setUp();
    let kept = 0;
    while (cache.plan(camera, SIZE, 7, false) === DRAW.none) kept++;
    expect(kept).toBe(MAX_AGE - 1);
  });
});
