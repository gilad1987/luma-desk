import { expect, test } from '@playwright/test';
import { bootApp, collectErrors, showShadowStage } from '../shared/e2e';

/** Depth samples per tile side in the read-back. */
const GRID = 16;

/** Every light gets a tile of 1024, and one frame may draw them all. */
const STILL = {
  layout: { size: 8192, hero: { count: 64, size: 1024 }, secondary: { count: 0, size: 512 } },
  maxDraws: 64,
  maxMs: 60_000,
};

// The atlas has no sampler yet, so no picture shows it: this spec draws it in a real WebGL context and reads it back.
test('the shadow atlas holds scenery between a light and its landing point as nearer depth', async ({ page }) => {
  const errors = collectErrors(page);
  await showShadowStage(page, await bootApp(page));
  const result = await page.evaluate((grid) => {
    const shadow = window.__deskShadow;
    if (!shadow) throw new Error('the shadow hook is not installed');
    // again: this frees the atlas of the wait, so `first` is the first frame of a new one
    shadow.enable(true);
    const first = shadow.frame();
    const tiles = (first?.tiles ?? []).map((tile) => ({ tile, depths: shadow.tile(tile, grid) }));
    const later = Array.from({ length: 12 }, () => shadow.frame()?.tiles.length ?? -1);
    return { first, tiles, later, casters: shadow.casters() };
  }, GRID);
  await test.info().attach('shadow-atlas.json', { body: JSON.stringify(result), contentType: 'application/json' });

  expect(result.casters?.triangles).toBeGreaterThan(0);
  // the fixture bodies stand in the caster scene
  expect(result.casters?.bodies.triangles).toBeGreaterThan(0);
  expect(result.first?.lights).toBeGreaterThan(0);
  expect(result.tiles.length).toBeGreaterThan(0);
  expect(result.tiles.length).toBeLessThanOrEqual(12);
  // a beam's range ends where it lands, so a depth well under 1 is a caster before the landing point; an empty
  // texel reads 1, and a tile that is all one value would mean the depth pass or the read-back does nothing
  const nearest = result.tiles.map(({ depths }) => Math.min(...depths));
  const farthest = result.tiles.map(({ depths }) => Math.max(...depths));
  expect(Math.min(...nearest)).toBeGreaterThan(0);
  expect(Math.min(...nearest)).toBeLessThan(0.9);
  expect(Math.max(...farthest)).toBeGreaterThan(0.9);
  // a static look: the lights past the hero tiles follow once at rest, four per frame, then nothing is drawn
  expect(result.later.at(-1)).toBe(0);
  expect(errors).toEqual([]);
});

test('the still layout draws every light a tile of 1024 in an atlas of 8192', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const limit = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 0;
    const size = Math.min(
      Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
    );
    // the context was only asked its limits; the desk's own context must not share the GPU with it
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return size;
  });
  test.info().skip(limit < 8192, `this WebGL context allows textures of ${limit} texels only`);
  await showShadowStage(page, desk, STILL);
  const result = await page.evaluate((changes) => {
    const shadow = window.__deskShadow;
    if (!shadow) throw new Error('the shadow hook is not installed');
    shadow.enable(true, changes);
    const first = shadow.frame();
    const depths = shadow.tile(first?.tiles.at(-1) ?? 0, 8);
    return { first, depths, again: shadow.frame()?.tiles.length };
  }, STILL);
  await test
    .info()
    .attach('shadow-still.json', { body: JSON.stringify({ limit, result }), contentType: 'application/json' });
  // every lit beam is a hero light here: all are drawn in the first frame, each in its own tile
  expect(result.first?.tiles.length).toBe(result.first?.tiled);
  expect(result.first?.tiled).toBe(Math.min(result.first?.lights ?? 0, 64));
  expect(Math.min(...result.depths)).toBeGreaterThan(0);
  expect(result.again).toBe(0);
  expect(errors).toEqual([]);
});
