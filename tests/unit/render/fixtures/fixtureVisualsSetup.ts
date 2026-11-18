import { Color, Mesh, PointLight } from 'three';
import { vi } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { FixtureVisualSync, FixtureVisuals } from '../../../../src/render/fixtures';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { buildFixtureScene } from './buildFixtureScene';

/** A `FixtureVisuals` over the shared fixture kit, with spy picker, the real sync and a slot per screen of `design`. */
export function setupFixtureVisuals(design: StageDesign) {
  stubCanvasDocument();
  const { scene, prims, beam, gobo, models, lensTextures } = buildFixtureScene();
  const u = () => ({ value: 0 });
  const uniforms = { uT: u(), uDim: u(), uMode: u(), uSpd: u(), uCol: { value: new Color() } };
  const targets = { uniforms, light: new PointLight(), strip: { material: { color: new Color() } } };
  const lights = new LightFrame();
  const goboTextures = gobo.textures;
  const sync = new FixtureVisualSync({ selection: { has: () => false }, beamTime: beam.time, goboTextures, lights });
  const picker = { register: vi.fn(), clear: vi.fn() };
  const visuals = new FixtureVisuals({ scene, prims, beam, gobo, models, lensTextures, picker, sync });
  const fixtures = rigFromDesign(design).fixtures;
  const screens = new Map(
    fixtures.filter((f) => f.T.shape === 'screen').map((f) => [f.id, { mesh: new Mesh(), targets }]),
  );
  return { scene, sync, picker, visuals, fixtures, screens, targets };
}

/** A copy of the first light of `fixtures` that inherits every field, with a type whose model the table lacks. */
export function lightWithoutModel(fixtures: readonly Fixture[]): Fixture {
  const light = fixtures.find((f) => f.T.shape !== 'screen');
  if (!light) throw new Error('rig has no light');
  return Object.assign(Object.create(light) as Fixture, { T: { ...light.T, model: 'no-such-model' } });
}
