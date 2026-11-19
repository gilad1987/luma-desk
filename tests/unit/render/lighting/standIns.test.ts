import { PointLight, Scene, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { UP } from '../../../../src/domain/venue';
import { BeamBatch } from '../../../../src/render/beams/BeamBatch';
import { beamVolume } from '../../../../src/render/beams/beamVolume';
import type { BeamFrame } from '../../../../src/render/fixtures/sync/BeamFrame';
import { syncPool } from '../../../../src/render/fixtures/sync/syncPool';
import { EXTRA, LightBatch } from '../../../../src/render/lighting/LightBatch';
import { surfaceLight } from '../../../../src/render/lighting/surfaceLight';
import { KeyLights } from '../../../../src/render/lights/KeyLights';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { SceneLights } from '../../../../src/render/lights/SceneLights';

/** A frame whose beams lit the stage floor, an audience zone and a blinder. */
function litFrame(): LightFrame {
  const frame = new LightFrame();
  frame.addStage([1, 0.5, 0.2], 1, 10);
  frame.addAudience(0, [1, 1, 1], 2);
  frame.addBlinder(1);
  return frame;
}

function standIns(scene: Scene): number[] {
  return scene.children.filter((child): child is PointLight => child instanceof PointLight).map((l) => l.intensity);
}

afterEach(() => {
  surfaceLight.batch = undefined;
  surfaceLight.isEnabled = true;
  surfaceLight.isAwaited = () => false;
  beamVolume.batch = undefined;
});

describe('the stand-in lights and the surface light pass', () => {
  it('keeps the bounce, audience and zone lights of a built-in stage', () => {
    const scene = new Scene();
    const lights = new SceneLights(scene, { wallFloodlight: null });
    lights.update(litFrame());
    expect(lights.stageLight.intensity).toBeCloseTo(1.2, 6);
    expect(lights.audienceLight.intensity).toBe(4);
    expect(standIns(scene).filter((intensity) => intensity > 0).length).toBeGreaterThanOrEqual(5);
  });

  it('keeps them dark while the surface light pass draws', () => {
    const scene = new Scene();
    const lights = new SceneLights(scene, { wallFloodlight: null });
    surfaceLight.batch = new LightBatch();
    lights.update(litFrame());
    expect(lights.stageLight.intensity).toBe(0);
    expect(lights.audienceLight.intensity).toBe(0);
    // the screen light is not a stand-in for beams and is dark here; every other point light is one
    expect(standIns(scene).every((intensity) => intensity === 0)).toBe(true);
  });

  it('gives a lit fixture to the surface light alone: no decal, no three.js key light, one row with its incidence', () => {
    const pool = { visible: true };
    const beam = { visible: true, parent: {} };
    const dir = new Vector3(0, -0.6, -0.8);
    const frame = {
      visual: { pool, beam, fixture: { id: 5 } },
      dir,
      hit: { t: 5, normal: UP },
    } as unknown as BeamFrame;
    const out = new LightFrame();
    const lights = (surfaceLight.batch = new LightBatch());
    beamVolume.batch = new BeamBatch();
    syncPool(frame, 0, [], out);
    expect(pool.visible).toBe(false);
    expect(out.keyCandidates).toHaveLength(0);
    expect(out.stage).toEqual({ r: 0, g: 0, b: 0 });
    const extras = new Float32Array(EXTRA);
    expect(lights.flush(new Float32Array(16), extras, { offer: () => undefined })).toBe(1);
    expect(extras[1]).toBeCloseTo(0.6, 6);
  });

  it('draws no decal and adds no stand-in share while the surface light of an MVR stage is on its way', () => {
    const pool = { visible: true };
    const frame = { visual: { pool, fixture: { id: 5 } }, hit: { t: 5, normal: UP } } as unknown as BeamFrame;
    const out = new LightFrame();
    surfaceLight.isAwaited = () => true;
    syncPool(frame, 0, [], out);
    expect(pool.visible).toBe(false);
    expect(out.stage).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('switches the surface light with the Real light button', () => {
    const keys = new KeyLights(new Scene());
    keys.setEnabled(false);
    expect(surfaceLight.isEnabled).toBe(false);
    keys.setEnabled(true);
    expect(surfaceLight.isEnabled).toBe(true);
  });
});
