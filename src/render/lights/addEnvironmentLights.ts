import { DirectionalLight, HemisphereLight, type Light, type Scene } from 'three';

/**
 * Adds the night ambience: a dim blue-over-brown sky fill and a cool moon key from the back left. Build step 1 of
 * the scene lights; it runs right after the post effects, before the sky. Returns both, so the scene lights can dark
 * them for an imported stage, which is an indoor hall.
 */
export function addEnvironmentLights(scene: Scene): readonly Light[] {
  const sky = new HemisphereLight(0x3a4466, 0x0a0806, 0.35);
  scene.add(sky);
  const moon = new DirectionalLight(0x8ea0d0, 0.25);
  moon.position.set(-30, 50, 40);
  scene.add(moon);
  return [sky, moon];
}
