import { NoColorSpace, SRGBColorSpace } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withSeededRandom } from '../seededRandom';
import { buildFixtureScene, stubCanvasDocument, uuidTrace } from './buildFixtureScene';

afterEach(() => vi.unstubAllGlobals());

describe('fixture scene build', () => {
  it('creates the same objects in the same order on every build (decision 24)', () => {
    stubCanvasDocument();
    buildFixtureScene(); // three creates the shared Sprite geometry once per module load
    const a = withSeededRandom(() => uuidTrace(buildFixtureScene().scene));
    const b = withSeededRandom(() => uuidTrace(buildFixtureScene().scene));
    expect(a.length).toBeGreaterThan(405 * 4);
    expect(b).toEqual(a);
  });

  it('builds one visual per fixture in array order; the screen fixture uses the venue screen', () => {
    stubCanvasDocument();
    const { fixtures, visuals, registered, screenMesh } = buildFixtureScene();
    expect(fixtures).toHaveLength(405);
    expect(visuals.map((v) => v.fixture)).toEqual(fixtures);
    const screen = visuals.filter((v) => v.kind === 'screen');
    expect(screen).toHaveLength(1);
    expect(registered.some(([o]) => o === screenMesh)).toBe(true);
  });

  it('shares model geometry and the haze/time uniforms across fixtures of one model', () => {
    stubCanvasDocument();
    const { visuals, beam } = buildFixtureScene();
    const lights = visuals.flatMap((v) => (v.kind === 'light' ? [v] : []));
    const byModel = new Map<string | undefined, (typeof lights)[number]>();
    for (const v of lights) {
      const first = byModel.get(v.fixture.T.model);
      if (first) expect(v.head.geometry).toBe(first.head.geometry);
      else byModel.set(v.fixture.T.model, v);
      expect(v.uniforms.uHaze).toBe(beam.haze);
      expect(v.uniforms.uTime).toBe(beam.time);
    }
    expect(byModel.size).toBe(9);
  });

  it('keeps gobo and glow textures without colour space, lens faces in sRGB', () => {
    stubCanvasDocument();
    const { gobo, visuals } = buildFixtureScene();
    expect(gobo.textures).toHaveLength(8);
    expect(gobo.icons).toHaveLength(8);
    for (const t of gobo.textures) {
      expect(t.colorSpace).toBe(NoColorSpace);
      expect(t.center.toArray()).toEqual([0.5, 0.5]);
    }
    expect(gobo.glow.colorSpace).toBe(NoColorSpace);
    const light = visuals.find((v) => v.kind === 'light');
    expect(light?.kind === 'light' && light.lensMat.map?.colorSpace).toBe(SRGBColorSpace);
  });
});
