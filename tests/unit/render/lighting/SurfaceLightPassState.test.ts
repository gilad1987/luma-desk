import { BoxGeometry, DepthTexture, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Texture } from 'three';
import { WebGLRenderTarget } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { LightBatch } from '../../../../src/render/lighting/LightBatch';
import { surfaceLight } from '../../../../src/render/lighting/surfaceLight';
import { SurfaceLightPass } from '../../../../src/render/lighting/SurfaceLightPass';
import { createFakeRenderer, type FakeRenderer } from '../../shared';

/** A pass over a scene of one deck, with one lit fixture in its batch. */
function setUp() {
  const scene = new Scene();
  const deck = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  scene.add(deck);
  const sceneDepth = { texture: new DepthTexture(4, 4) };
  const context = { camera: new PerspectiveCamera(), scene, sceneDepth, occlusion: new Texture() };
  const rows = new LightBatch();
  const row = new Float32Array(ROW);
  row.set([0, 8, 4, 9, 0, -0.6, -0.8, 0.1, 5, 5, 5, 0.8, 0, 0, 0.1, 0]);
  rows.offer({ visible: true, parent: {} }, 3, row, 0.6);
  const pass = new SurfaceLightPass(context, { rows, goboSheet: new Texture(), ownsSheet: true });
  return { pass, deck, material: deck.material, scene };
}

function draw(pass: SurfaceLightPass, renderer: FakeRenderer): void {
  const buffer = new WebGLRenderTarget(4, 4);
  pass.render(renderer.asRenderer, buffer, buffer);
}

afterEach(() => {
  surfaceLight.batch = undefined;
  surfaceLight.isEnabled = true;
});

describe('the state the surface light pass changes', () => {
  it('is put back after a frame: the pass draws with no clear and leaves the clear as it was', () => {
    const { pass, deck, material } = setUp();
    const renderer = createFakeRenderer();
    draw(pass, renderer);
    expect(renderer.render.mock.calls.length).toBeGreaterThan(1);
    expect(renderer.autoClear).toBe(true);
    expect(deck.material).toBe(material);
    pass.dispose();
  });

  it('is put back when a draw of the lights throws', () => {
    const { pass, deck, material } = setUp();
    // the draws of the pass itself run with no clear; the draws of the surface buffers clear
    const renderer = createFakeRenderer((fake) => {
      if (!fake.autoClear) throw new Error('context lost');
    });
    expect(() => draw(pass, renderer)).toThrow('context lost');
    expect(renderer.autoClear).toBe(true);
    expect(renderer.shadowMap.autoUpdate).toBe(true);
    expect(deck.material).toBe(material);
    pass.dispose();
  });

  it('is put back when a draw of the surface buffers throws', () => {
    const { pass, deck, material, scene } = setUp();
    const renderer = createFakeRenderer(() => {
      throw new Error('context lost');
    });
    expect(() => draw(pass, renderer)).toThrow('context lost');
    expect(renderer.autoClear).toBe(true);
    expect(renderer.shadowMap.autoUpdate).toBe(true);
    expect(deck.material).toBe(material);
    expect(scene.matrixWorldAutoUpdate).toBe(true);
    pass.dispose();
  });
});
