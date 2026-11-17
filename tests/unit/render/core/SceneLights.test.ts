/**
 * Scene light creation order (decision 24) and the per-frame aggregate maths against the legacy formulas. How
 * the lit scene looks is owned by the screenshot suite.
 */
import { DirectionalLight, HemisphereLight, Object3D, PointLight, Scene, SpotLight } from 'three';
import { describe, expect, it } from 'vitest';
import { SceneLights } from '../../../../src/render/SceneLights';
import { addEnvironmentLights } from '../../../../src/render/SceneLightsEnvironment';
import { LightFrame } from '../../../../src/render/SceneLightsFrame';

const kinds = (scene: Scene): string[] => scene.children.map((child) => child.type);

describe('addEnvironmentLights', () => {
  it('adds the hemisphere fill, then the moon at its legacy position', () => {
    const scene = new Scene();
    addEnvironmentLights(scene);
    expect(scene.children[0]).toBeInstanceOf(HemisphereLight);
    const moon = scene.children[1];
    expect(moon).toBeInstanceOf(DirectionalLight);
    expect(moon?.position.toArray()).toEqual([-30, 50, 40]);
  });
});

describe('SceneLights', () => {
  it('creates stage, audience, 3 zones, 3 house spots (each then its target) and the screen light in order', () => {
    const scene = new Scene();
    new SceneLights(scene, null);
    const house = ['SpotLight', 'Object3D'];
    expect(kinds(scene)).toEqual([
      ...['PointLight', 'PointLight', 'PointLight', 'PointLight', 'PointLight'],
      ...house,
      ...house,
      ...house,
      'PointLight',
    ]);
    const spots = scene.children.filter((child): child is SpotLight => child instanceof SpotLight);
    expect(spots.map((spot) => spot.color.getHex())).toEqual([0xffd4a0, 0xffd4a0, 0xdfe6ff]);
    expect(spots[2]?.target.position.toArray()).toEqual([0, 0, 34]);
  });

  it('turns the stage bounce and zones to the normalised beam colour with the legacy caps', () => {
    const scene = new Scene();
    const lights = new SceneLights(scene, null);
    const frame = new LightFrame();
    frame.addStage([1, 0.5, 0], 10, 1);
    frame.addAudience(-20, [0, 0, 1], 100);
    frame.addBlinder(0.5);
    lights.update(frame);
    expect(lights.stageLight.color.toArray()).toEqual([1, 0.5, 0]);
    expect(lights.stageLight.intensity).toBe(Math.min(10 * 0.12, 6));
    expect(lights.audienceLight.intensity).toBe(2);
    const zones = scene.children.slice(2, 5) as PointLight[];
    expect(zones.map((zone) => zone.intensity)).toEqual([70 + 3, 3, 3]);
    expect(zones[0]?.color.toArray()).toEqual([0, 0, 1]);
  });

  it('sets the house spots from the house level and forces the wall light dark', () => {
    const scene = new Scene();
    const wall = new PointLight(0xffffff, 5);
    const lights = new SceneLights(scene, wall);
    lights.setHouseLevel(0.5);
    lights.update(new LightFrame());
    const spots = scene.children.filter((child): child is SpotLight => child instanceof SpotLight);
    expect(spots.map((spot) => spot.intensity)).toEqual([550, 550, 250]);
    expect(wall.intensity).toBe(0);
    expect(lights.stageLight.intensity).toBe(0);
  });

  it('keeps the screen light for the screen fixture to drive', () => {
    const lights = new SceneLights(new Scene(), null);
    expect(lights.screenLight.position.toArray()).toEqual([0, 8, -16]);
    expect(lights.screenLight).toBeInstanceOf(Object3D);
  });
});
