import { DirectionalLight, HemisphereLight, type Scene } from 'three';

/**
 * Adds the night ambience: a dim blue-over-brown sky fill and a cool moon key from the back left. Build step 1 of
 * the scene lights; it runs right after the post effects, before the sky.
 */
export function addEnvironmentLights(scene: Scene): void {
  scene.add(new HemisphereLight(0x3a4466, 0x0a0806, 0.35));
  const moon = new DirectionalLight(0x8ea0d0, 0.25);
  moon.position.set(-30, 50, 40);
  scene.add(moon);
}
