import { BoxGeometry, Color, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Sprite } from 'three';
import { describe, expect, it } from 'vitest';
import { GBuffer } from '../../../../src/render/gbuffer/GBuffer';
import { createFakeRenderer } from '../../shared';

function setUp() {
  const scene = new Scene();
  scene.background = new Color(0x202020);
  const deck = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  const glow = new Sprite();
  scene.add(deck, glow);
  return { scene, deck, glow, material: deck.material, background: scene.background, camera: new PerspectiveCamera() };
}

describe('the surface buffers', () => {
  it('draw the swapped scene with a transparent clear and no background, then put everything back', () => {
    const { scene, deck, glow, material, background, camera } = setUp();
    const buffers = new GBuffer();
    const seen: unknown[] = [];
    const renderer = createFakeRenderer((fake) => {
      seen.push(
        deck.material !== material,
        glow.layers.mask,
        scene.background,
        fake.clearAlpha,
        fake.shadowMap.autoUpdate,
      );
    });
    buffers.render(renderer.asRenderer, scene, camera);
    expect(seen).toEqual([true, 0, null, 0, false]);
    expect(deck.material).toBe(material);
    expect(glow.layers.mask).toBe(1);
    expect(scene.background).toBe(background);
    expect([renderer.clearAlpha, renderer.clearColor.getHex(), renderer.shadowMap.autoUpdate]).toEqual([
      1,
      0x123456,
      true,
    ]);
    buffers.dispose();
  });

  it.each(['render', 'casters'] as const)('put the scene and the renderer back when a draw of %s throws', (draw) => {
    const { scene, deck, glow, material, background, camera } = setUp();
    const buffers = new GBuffer();
    const renderer = createFakeRenderer(() => {
      throw new Error('context lost');
    });
    renderer.autoClear = false;
    const run = (): void => {
      if (draw === 'render') buffers.render(renderer.asRenderer, scene, camera);
      else buffers.casters(renderer.asRenderer, scene, camera, () => renderer.asRenderer.render(scene, camera));
    };
    expect(run).toThrow('context lost');
    expect(deck.material).toBe(material);
    expect(glow.layers.mask).toBe(1);
    expect(scene.background).toBe(background);
    expect(renderer.autoClear).toBe(false);
    expect([renderer.clearAlpha, renderer.clearColor.getHex(), renderer.shadowMap.autoUpdate]).toEqual([
      1,
      0x123456,
      true,
    ]);
    // the next draw starts from a clean swap: nothing of the failed one is left in its lists
    renderer.render.mockImplementation(() => undefined);
    run();
    expect(deck.material).toBe(material);
    buffers.dispose();
  });
});
