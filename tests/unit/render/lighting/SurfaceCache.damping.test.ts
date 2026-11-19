import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { DRAW, SurfaceCache } from '../../../../src/render/lighting/SurfaceCache';

const SIZE = { width: 1280, height: 720 };

describe('SurfaceCache while the orbit damping eases a drag out', () => {
  it('takes a step far below a pixel as still, a real move as a view change, and steps that add up as one', () => {
    const camera = new PerspectiveCamera(50);
    camera.updateMatrixWorld();
    const cache = new SurfaceCache();
    expect(cache.plan(camera, SIZE, 7, false)).toBe(DRAW.buffers);
    const draws: number[] = [];
    // the residual of a damped orbit: a twentieth of a millimetre and a hundredth of a milliradian per frame
    for (let frame = 0; frame < 4; frame++) {
      camera.position.x += 0.00005;
      camera.rotation.y += 0.00001;
      camera.updateMatrixWorld();
      draws.push(cache.plan(camera, SIZE, 7, false));
    }
    expect(draws).toEqual([DRAW.none, DRAW.none, DRAW.none, DRAW.none]);
    // the same steps add up: a quarter of a millimetre past the last draw is a view change
    camera.position.x += 0.00005;
    camera.updateMatrixWorld();
    expect(cache.plan(camera, SIZE, 7, false)).toBe(DRAW.buffers);
    camera.rotation.y += 0.01;
    camera.updateMatrixWorld();
    expect(cache.plan(camera, SIZE, 7, false)).toBe(DRAW.buffers);
    expect(cache.plan(camera, SIZE, 7, false)).toBe(DRAW.none);
  });
});
