/** The emitter mask leaves the camera, the scene and the renderer as they were, also after a draw that throws. */
import { BoxGeometry, Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene } from 'three';
import { Texture, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { EmitterMask } from '../../../../src/render/occlusion/EmitterMask';

const MASK_LAYER = 30;
const SIZE = { width: 64, height: 36 };

/** A renderer with the members the mask uses; `render` runs `draw`. No WebGL context exists in a unit test. */
function fakeRenderer(draw: () => void) {
  const state = { autoClear: false, shadowMap: { autoUpdate: true }, alpha: 0.5, targets: 0 };
  const renderer = {
    ...state,
    shadowMap: state.shadowMap,
    getClearAlpha: () => state.alpha,
    getClearColor: (out: Color) => out.set(0x112233),
    setClearColor: (_colour: unknown, alpha: number) => void (state.alpha = alpha),
    setRenderTarget: () => void (state.targets += 1),
    render: draw,
  };
  return { renderer: renderer as unknown as WebGLRenderer, read: renderer, state };
}

function stage() {
  const scene = new Scene();
  scene.background = new Color(0x050505);
  const box = new BoxGeometry();
  const lens = new Mesh(box, new MeshBasicMaterial());
  const deck = new Mesh(box, new MeshStandardMaterial());
  scene.add(lens, deck);
  const camera = new PerspectiveCamera();
  camera.layers.enable(2);
  return { scene, camera, lens, deck };
}

describe('EmitterMask', () => {
  it('draws only the meshes that show their own light, with its material, and puts everything back', () => {
    const { scene, camera, lens, deck } = stage();
    const before = { layers: camera.layers.mask, override: scene.overrideMaterial, background: scene.background };
    const seen: boolean[] = [];
    const { renderer, read, state } = fakeRenderer(() => {
      seen.push(lens.layers.test(camera.layers), deck.layers.test(camera.layers), scene.overrideMaterial !== null);
    });
    const mask = new EmitterMask(new Texture());
    mask.draw(renderer, scene, camera, SIZE);
    expect(seen).toEqual([true, false, true]);
    expect([camera.layers.mask, scene.overrideMaterial, scene.background]).toEqual(Object.values(before));
    expect([read.autoClear, state.shadowMap.autoUpdate, state.alpha]).toEqual([false, true, 0.5]);
    mask.dispose();
  });

  it('puts the camera layers, the override material and the renderer state back after a draw that throws', () => {
    const { scene, camera } = stage();
    const layers = camera.layers.mask;
    const { renderer, read, state } = fakeRenderer(() => {
      throw new Error('context lost');
    });
    const mask = new EmitterMask(new Texture());
    expect(() => mask.draw(renderer, scene, camera, SIZE)).toThrow('context lost');
    expect([camera.layers.mask, scene.overrideMaterial]).toEqual([layers, null]);
    expect(scene.background).toBeInstanceOf(Color);
    expect([read.autoClear, state.shadowMap.autoUpdate, state.alpha, scene.matrixWorldAutoUpdate]).toEqual([
      false,
      true,
      0.5,
      true,
    ]);
    mask.dispose();
  });

  it('takes its layer off the meshes it tagged when it is disposed', () => {
    const { scene, camera, lens } = stage();
    const mask = new EmitterMask(new Texture());
    mask.draw(fakeRenderer(() => undefined).renderer, scene, camera, SIZE);
    expect(lens.layers.isEnabled(MASK_LAYER)).toBe(true);
    mask.dispose();
    expect(lens.layers.isEnabled(MASK_LAYER)).toBe(false);
    expect(lens.layers.isEnabled(0)).toBe(true);
  });
});
