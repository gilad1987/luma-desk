import { BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene, Sprite } from 'three';
import { describe, expect, it } from 'vitest';
import { SceneSwap } from '../../../../src/render/gbuffer/SceneSwap';

const replacement = new MeshBasicMaterial();
const noData = new MeshBasicMaterial();

function createScene() {
  const scene = new Scene();
  const box = new BoxGeometry();
  const deck = new Mesh(box, new MeshStandardMaterial());
  // transparent, but it writes depth in the scene pass: glass in front of the deck
  const glass = new Mesh(box, new MeshBasicMaterial({ transparent: true }));
  const parts = new Mesh(box, [new MeshStandardMaterial(), new MeshStandardMaterial()]);
  const haze = new Mesh(box, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
  const glow = new Sprite();
  // a child of a hidden object still draws: the mask is not inherited
  const lens = new Mesh(box, new MeshBasicMaterial());
  glow.add(lens);
  const cone = new Mesh(box, new MeshStandardMaterial());
  cone.layers.set(1);
  scene.add(deck, glass, parts, haze, glow, cone);
  return { scene, deck, glass, parts, haze, glow, lens, cone };
}

describe('SceneSwap', () => {
  it('gives the opaque meshes the replacement and hides what writes no depth, then puts all of it back', () => {
    const { scene, deck, haze, glow, lens, cone } = createScene();
    const before = [deck.material, lens.material, cone.material];
    const swap = new SceneSwap();
    swap.apply(scene, new PerspectiveCamera(), () => replacement, noData);
    expect(deck.material).toBe(replacement);
    expect(lens.material).toBe(replacement);
    expect(haze.layers.mask).toBe(0);
    expect(glow.layers.mask).toBe(0);
    // the camera does not see layer 1 (a beam cone), so the swap leaves it alone
    expect(cone.material).toBe(before[2]);
    swap.restore();
    expect([deck.material, lens.material, cone.material]).toEqual(before);
    expect(haze.layers.mask).toBe(1);
    expect(glow.layers.mask).toBe(1);
  });

  it('draws a mesh that writes depth but is no surface with the one no-data material, not the mesh behind it', () => {
    const { scene, glass, parts } = createScene();
    const own = [glass.material, parts.material];
    const swap = new SceneSwap();
    swap.apply(scene, new PerspectiveCamera(), () => replacement, noData);
    expect(glass.material).toBe(noData);
    expect(parts.material).toBe(noData);
    // it stays in the draw: hidden by its mask, the deck behind it would write its normal at the depth of the glass
    expect([glass.layers.mask, parts.layers.mask]).toEqual([1, 1]);
    swap.restore();
    expect([glass.material, parts.material]).toEqual(own);
  });
});
