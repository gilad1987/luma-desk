/** The show-camera clock of an MVR stage (the batch time) moves with the frame clock, also with no fixture lit. */
import { Mesh, Scene, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BeamBatch } from '../../../../src/render/beams/BeamBatch';
import { beamVolume } from '../../../../src/render/beams/beamVolume';
import { FixtureVisualSync } from '../../../../src/render/fixtures';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { builtInSurfaces } from '../builtInSurfaces';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { buildFixtureScene } from './buildFixtureScene';

afterEach(() => {
  beamVolume.batch = undefined;
  vi.unstubAllGlobals();
});

/** The theatre rig, every fixture dark, with a volume batch as an MVR chain sets it. */
function setup() {
  stubCanvasDocument();
  const fixtures = rigFromDesign(createTemplate('theatre')).fixtures;
  const built = buildFixtureScene({ scene: new Scene(), screenMesh: new Mesh(), fixtures });
  const sync = new FixtureVisualSync({
    selection: { has: () => false },
    beamTime: built.beam.time,
    goboTextures: built.gobo.textures,
    lights: new LightFrame(),
    surface: builtInSurfaces(),
  });
  sync.setVisuals(built.visuals, new Map());
  const batch = new BeamBatch();
  beamVolume.batch = batch;
  return { sync, batch };
}

describe('FixtureVisualSync show clock', () => {
  it('moves the batch time with the frame clock when no fixture is lit, one frame behind as a lit beam has it', () => {
    const { sync, batch } = setup();
    const camera = new Vector3();
    sync.update(2, 0.016, camera);
    sync.update(2.016, 0.016, camera);
    expect(batch.size).toBe(0);
    expect(batch.time).toBe(2);
    sync.update(2.032, 0.016, camera);
    expect(batch.time).toBe(2.016);
  });

  it('stands still under a frozen clock, so a test frame is a function of that frame alone', () => {
    const { sync, batch } = setup();
    const camera = new Vector3();
    for (let i = 0; i < 3; i++) sync.update(5, 0, camera);
    expect(batch.time).toBe(5);
  });
});
