/** The hall light of an imported stage: built only while on, neutral, scaled by the house level, freed on hide. */
import { Color, DirectionalLight, Fog, HemisphereLight, PointLight, Scene, SpotLight } from 'three';
import { describe, expect, it } from 'vitest';
import { addEnvironmentLights } from '../../../../src/render/lights/addEnvironmentLights';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { MvrHallLight } from '../../../../src/render/lights/MvrHallLight';
import { SceneLights } from '../../../../src/render/lights/SceneLights';

const BOX = { min: [-20, 0, -10], max: [20, 12, 40] } as const;

describe('MvrHallLight', () => {
  it('adds nothing until shown, then frees its lights and restores background and fog on hide', () => {
    const scene = new Scene();
    const background = new Color(0x01020a);
    const fog = new Fog(0x05060c);
    scene.background = background;
    scene.fog = fog;
    const hall = new MvrHallLight(scene);
    expect(scene.children).toHaveLength(0);
    hall.show(BOX);
    expect(hall.isOn).toBe(true);
    expect(scene.children.some((child) => child instanceof HemisphereLight)).toBe(true);
    expect(scene.background).not.toBe(background);
    hall.hide();
    expect(hall.isOn).toBe(false);
    expect(scene.children).toHaveLength(0);
    expect(scene.background).toBe(background);
    expect(scene.fog).toBe(fog);
  });

  it('aims every work light at the box centre from above and scales them with the level', () => {
    const scene = new Scene();
    const hall = new MvrHallLight(scene);
    hall.show(BOX);
    hall.setLevel(0);
    const lights = scene.children.filter((child): child is DirectionalLight => child instanceof DirectionalLight);
    expect(lights).toHaveLength(3);
    for (const light of lights) {
      expect(light.intensity).toBe(0);
      expect(light.target.position.toArray()).toEqual([0, 6, 15]);
      expect(light.position.y).toBeGreaterThan(12);
    }
    hall.setLevel(1);
    expect(lights.every((light) => light.intensity > 0)).toBe(true);
  });
});

describe('SceneLights with the hall on', () => {
  it('darks the demo house spots and night lights, and lights them again after hide', () => {
    const scene = new Scene();
    const environment = addEnvironmentLights(scene);
    const lights = new SceneLights(scene, { wallFloodlight: new PointLight() }, environment);
    lights.setHouseLevel(1);
    lights.hall.show(BOX);
    lights.update(new LightFrame());
    const spots = scene.children.filter((child): child is SpotLight => child instanceof SpotLight);
    expect(spots.map((spot) => spot.intensity)).toEqual([0, 0, 0]);
    expect(environment.every((light) => !light.visible)).toBe(true);
    lights.hall.hide();
    lights.update(new LightFrame());
    expect(spots.map((spot) => spot.intensity)).toEqual([1100, 1100, 500]);
    expect(environment.every((light) => light.visible)).toBe(true);
  });
});
