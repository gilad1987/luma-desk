import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene } from 'three';
import { expect, it } from 'vitest';
import { MAX_AGE } from '../../../../src/render/lighting/SurfaceCache';
import { OcclusionCache } from '../../../../src/render/occlusion/OcclusionCache';

const SIZE = { width: 1280, height: 720 };
/** A mesh that writes no depth, as a beam, a light pool or a lens glow. */
const light = (): Mesh => new Mesh(new BoxGeometry(), new MeshBasicMaterial({ depthWrite: false, transparent: true }));

it('draws again when a depth mesh or a group of them hides, not when a beam, a pool or a glow flashes', () => {
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const rig = new Group();
  const body = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  const beam = light();
  rig.add(body, beam);
  const glows = new Group();
  glows.add(light(), light());
  scene.add(rig, glows);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const cache = new OcclusionCache();
  const isStale = (): boolean => cache.isStale(camera, scene, SIZE, true);
  expect(isStale()).toBe(true);
  // a strobe: the beam beside a body, and a group of glows alone, show and hide in each flash
  for (const flash of [beam, glows, beam, glows]) {
    flash.visible = !flash.visible;
    expect(isStale()).toBe(false);
  }
  rig.visible = false;
  expect([isStale(), isStale()]).toEqual([true, false]);
  rig.visible = true;
  expect(isStale()).toBe(true);
  body.visible = false;
  expect([isStale(), isStale()]).toEqual([true, false]);
});

it('watches a body that came into a group of beams alone from the next age redraw on', () => {
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const rig = new Group();
  rig.add(light());
  scene.add(rig);
  camera.updateMatrixWorld(true);
  const cache = new OcclusionCache();
  const isStale = (): boolean => cache.isStale(camera, scene, SIZE, true);
  expect(isStale()).toBe(true);
  const body = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  rig.add(body);
  scene.updateMatrixWorld(true);
  // no list watches the group, so the body shows at the age redraw, as a sway does
  for (let n = 1; n < MAX_AGE; n++) expect(isStale()).toBe(false);
  expect([isStale(), isStale()]).toEqual([true, false]);
  body.position.x = 1;
  scene.updateMatrixWorld(true);
  expect([isStale(), isStale()]).toEqual([true, false]);
});
