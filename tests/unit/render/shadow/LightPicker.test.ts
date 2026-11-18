import { Matrix4, PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { RayProbe } from '../../../../src/render/shadow/coneCasters';
import { LightPicker } from '../../../../src/render/shadow/LightPicker';
import { SHADOW_DEFAULTS } from '../../../../src/render/shadow/shadowConfig';
import { beamRows, setRow } from './shadowRows';

describe('LightPicker', () => {
  const config = {
    ...SHADOW_DEFAULTS,
    layout: { size: 4096, hero: { count: 2, size: 1024 }, secondary: { count: 3, size: 512 } },
  };
  const camera = new PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(2, 4, 20);
  camera.lookAt(2, 4, 0);
  camera.updateMatrixWorld();
  const viewProjection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;

  it('gives a light past the hero tiles a tile only once it is at rest, and traces no ray for one that moves', () => {
    const probe = vi.fn<RayProbe>(() => 1);
    const picker = new LightPicker(config, probe);
    const rows = beamRows(5);
    // lights 0 and 1 are the brightest, so they are the hero lights; light 4 moves in every frame
    setRow(rows, 0, { origin: [0, 8, 0], peak: 9 });
    setRow(rows, 1, { origin: [1, 8, 0], peak: 8 });
    const counts: number[] = [];
    for (let frame = 0; frame < 5; frame++) {
      setRow(rows, 4, { origin: [4, 8, frame * 0.01] });
      const picks = picker.pick(rows, 5, viewProjection, 1);
      counts.push(picks.count);
      expect([...picks.lights.subarray(0, 2)]).toEqual([0, 1]);
      expect([...picks.lights.subarray(2, picks.count)]).not.toContain(4);
    }
    expect(counts).toEqual([2, 2, 4, 4, 4]);
    // two cones, lights 2 and 3, each found at its first ray; never the moving light or a hero light
    expect(probe).toHaveBeenCalledTimes(2);
    // a light that moved must rest longer than `restFrames`: 15 frames from its last move
    for (let frame = 0; frame < 14; frame++) picker.pick(rows, 5, viewProjection, 1);
    expect(picker.picks.count).toBe(4);
    picker.pick(rows, 5, viewProjection, 1);
    expect(picker.picks.count).toBe(5);
  });

  it('keeps a moving light shadowed while it is a hero light', () => {
    const picker = new LightPicker(config, () => Infinity);
    const rows = beamRows(3);
    for (let frame = 0; frame < 4; frame++) {
      setRow(rows, 2, { origin: [2, 8, frame * 0.01], peak: 9 });
      expect(picker.pick(rows, 3, viewProjection, 1).lights[0]).toBe(2);
    }
  });
});
