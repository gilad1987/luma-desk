/** A holder that is still empty at a swap is watched: the mesh that loads into it later moves the stamp. */
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene } from 'three';
import { expect, it } from 'vitest';
import { SceneSwap } from '../../../../src/render/gbuffer/SceneSwap';

it('moves the stamp in the frame a mesh is added to a visible group that had no children', () => {
  const scene = new Scene();
  const layer = new Group();
  scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()), layer);
  const swap = new SceneSwap();
  swap.apply(scene, new PerspectiveCamera(), () => new MeshBasicMaterial(), new MeshBasicMaterial());
  swap.restore();
  const before = swap.watch.stamp();
  expect(swap.watch.stamp()).toBe(before);
  // the scenery of a layer arrives after the first draw: without the watch it showed only at the age limit
  layer.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
  expect(swap.watch.stamp()).not.toBe(before);
});
