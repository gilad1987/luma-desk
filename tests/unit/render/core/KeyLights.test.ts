import { describe, expect, it } from 'vitest';
import { Scene, SpotLight, Vector3 } from 'three';
import { clamp, D2R } from '../../../../src/core';
import { Fixture } from '../../../../src/domain/Fixture';
import { LightFrame, type KeyLightCandidate } from '../../../../src/render/SceneLightsFrame';
import { KeyLights } from '../../../../src/render/SceneLightsKeys';

function candidate(score: number, type: 'wash' | 'spot' = 'spot'): KeyLightCandidate {
  const fixture = new Fixture(score, type, new Vector3(), 'hang', null);
  const position = new Vector3(score, 10, 0);
  return {
    fixture,
    score,
    intensity: 0.8,
    color: [1, 0.2, 0],
    zoom: 20,
    length: 9,
    position,
    direction: new Vector3(0, -1, 0),
  };
}

function spots(scene: Scene): SpotLight[] {
  return scene.children.filter((child): child is SpotLight => child instanceof SpotLight);
}

describe('KeyLights', () => {
  it('creates 12 spots, each followed by its target, with soft shadows on the first 4 only', () => {
    const scene = new Scene();
    new KeyLights(scene);
    expect(scene.children).toHaveLength(24);
    const lights = spots(scene);
    expect(lights.map((light) => light.castShadow)).toEqual([
      ...Array<boolean>(4).fill(true),
      ...Array<boolean>(8).fill(false),
    ]);
    expect(lights[0]?.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    expect([lights[0]?.shadow.bias, lights[0]?.shadow.radius]).toEqual([-0.0004, 3]);
  });

  it('aims the brightest candidates first with the legacy angle, penumbra and intensity maths', () => {
    const scene = new Scene();
    const keys = new KeyLights(scene);
    const frame = new LightFrame();
    frame.addKeyCandidate(candidate(1));
    frame.addKeyCandidate(candidate(5, 'wash'));
    keys.update(frame);
    const [first, second, third] = spots(scene);
    const wash = frame.keyCandidates[0];
    expect(wash?.score).toBe(5);
    expect(first?.position.toArray()).toEqual([5, 10, 0]);
    expect(first?.target.position.toArray()).toEqual([5, 1, 0]);
    expect(first?.angle).toBe(Math.min((clamp(20, 4, 60) / 2) * D2R * 1.15, 1.2));
    expect([first?.penumbra, second?.penumbra]).toEqual([0.85, 0.35]);
    const power = wash?.fixture.T.power ?? NaN;
    expect(first?.intensity).toBe(0.8 * power * 450 * clamp(12 / (20 + 6), 0.25, 1.6));
    expect(third?.intensity).toBe(0);
  });

  it('keeps every key light dark when disabled', () => {
    const scene = new Scene();
    const keys = new KeyLights(scene);
    const frame = new LightFrame();
    frame.addKeyCandidate(candidate(3));
    keys.setEnabled(false);
    keys.update(frame);
    expect(spots(scene).every((light) => light.intensity === 0)).toBe(true);
  });
});
