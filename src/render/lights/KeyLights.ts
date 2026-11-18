import { SpotLight, type Scene } from 'three';
import { clamp, D2R } from '../../core';
import type { KeyLightCandidate, LightFrame } from './LightFrame';

/** How many beams become real spot lights each frame. */
const KEY_COUNT = 12;
/** The first few key lights cast soft shadows; more would cost too much. */
const SHADOW_COUNT = 4;

/** Best score first; a module constant so the per-frame sort makes no closure. */
const byScoreDescending = (a: KeyLightCandidate, b: KeyLightCandidate): number => b.score - a.score;

/**
 * Real spot lights that follow the brightest beams hitting the stage, so performers and scenery are lit and shadowed
 * by the rig. Build step 3 of the scene lights; it runs after the lens textures, before the fixture models.
 */
export class KeyLights {
  private readonly lights: SpotLight[] = [];
  private isEnabled = true;

  constructor(scene: Scene) {
    for (let i = 0; i < KEY_COUNT; i++) {
      const light = new SpotLight(0xffffff, 0, 0, 0.3, 0.5, 2);
      light.castShadow = i < SHADOW_COUNT;
      if (light.castShadow) {
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.bias = -0.0004;
        light.shadow.camera.near = 2;
        light.shadow.camera.far = 70;
        light.shadow.radius = 3;
      }
      scene.add(light);
      scene.add(light.target);
      this.lights.push(light);
    }
  }

  /** The UI "lights" toggle; off keeps every key light dark. */
  setEnabled(isOn: boolean): void {
    this.isEnabled = isOn;
  }

  /** The Real light button reads this flag, so the key lights stay its one owner (starts on). */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /** Sorts the frame's candidates by score (in place, stable) and aims one light at each of the best. */
  update(frame: LightFrame): void {
    const candidates = frame.keyCandidates;
    candidates.sort(byScoreDescending);
    // indexed loop, no closure: this runs every frame
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      if (light) this.aim(light, candidates[i]);
    }
  }

  /** Aims one light at a candidate beam, or darkens it when there is none or the lights are off. */
  private aim(light: SpotLight, candidate: KeyLightCandidate | undefined): void {
    if (!candidate || !this.isEnabled) {
      light.intensity = 0;
      return;
    }
    const { fixture, position, zoom } = candidate;
    light.position.copy(position);
    light.target.position.copy(position).addScaledVector(candidate.direction, candidate.length);
    light.target.updateMatrixWorld();
    light.angle = Math.min((clamp(zoom, 4, 60) / 2) * D2R * 1.15, 1.2);
    light.penumbra = fixture.type === 'wash' ? 0.85 : 0.35;
    light.color.setRGB(candidate.color[0], candidate.color[1], candidate.color[2]);
    light.intensity = candidate.intensity * fixture.T.power * 450 * clamp(12 / (zoom + 6), 0.25, 1.6);
  }
}
