/** The beams' haze-noise time moves every frame, also with a rig that has no screen fixture. */
import { Mesh, Scene, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { createTemplate, type TemplateId } from '../../../../src/domain/stage/templates';
import { FixtureVisualSync } from '../../../../src/render/fixtures';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { builtInSurfaces } from '../builtInSurfaces';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { buildFixtureScene } from './buildFixtureScene';

afterEach(() => vi.unstubAllGlobals());

/** The fixture visuals of a template's rig, synced into a fresh light frame. */
function setup(template: TemplateId) {
  stubCanvasDocument();
  const fixtures = rigFromDesign(createTemplate(template)).fixtures;
  const built = buildFixtureScene({ scene: new Scene(), screenMesh: new Mesh(), fixtures });
  const sync = new FixtureVisualSync({
    selection: { has: () => false },
    beamTime: built.beam.time,
    goboTextures: built.gobo.textures,
    lights: new LightFrame(),
    surface: builtInSurfaces(),
  });
  sync.setVisuals(built.visuals, new Map());
  return { ...built, sync };
}

describe('FixtureVisualSync beam haze time', () => {
  it.each<TemplateId>(['theatre', 'empty'])('advances every frame with the %s rig, which has no screen', (name) => {
    const { visuals, sync, beam } = setup(name);
    expect(visuals.some((v) => v.kind === 'screen')).toBe(false);
    sync.update(1.5, 0.016, new Vector3());
    expect(beam.time.value).toBe(1.5);
    sync.update(1.75, 0.016, new Vector3());
    expect(beam.time.value).toBe(1.75);
  });
});
