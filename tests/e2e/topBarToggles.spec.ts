/**
 * Owns the top bar's render controls. A toggle button lights from the flag its render object owns (glow: the
 * renderer, real light: the key lights, ids: the overlay), so its `on` class proves the press reached the renderer.
 * The House slider has no such flag, so its check measures the picture. Two captures of the viewer differ byte for
 * byte even with no change, in the original page (3cbff92) too, so no check here compares images exactly; the
 * screenshot suite owns what the picture looks like.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { bootApp, stepFrames } from '../shared/e2e';

const isLit = (button: Locator) => button.evaluate((b) => b.classList.contains('on'));

/** Mean channel value (0-255) of the viewer, decoded by the browser so the spec needs no image library. */
async function viewerBrightness(page: Page): Promise<number> {
  const png = await page.locator('#viewer').screenshot();
  return page.evaluate(
    async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = [image.width, image.height];
      const context = canvas.getContext('2d');
      if (!context) throw new Error('viewerBrightness: no 2D context to decode the screenshot');
      context.drawImage(image, 0, 0);
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 0; i < rgba.length; i += 4) sum += (rgba[i] ?? 0) + (rgba[i + 1] ?? 0) + (rgba[i + 2] ?? 0);
      return sum / ((rgba.length / 4) * 3);
    },
    `data:image/png;base64,${png.toString('base64')}`,
  );
}

const TOGGLES = [
  ['Glow', true],
  ['Fixture IDs', false],
  ['Real light', true],
] as const;

for (const [name, startsOn] of TOGGLES) {
  test(`${name} flips its render flag on each press`, async ({ page }) => {
    await bootApp(page);
    const button = page.getByRole('button', { name, exact: true });
    const lit = [await isLit(button)];
    await button.click();
    lit.push(await isLit(button));
    await button.click();
    lit.push(await isLit(button));
    expect(lit).toEqual([startsOn, !startsOn, startsOn]);
  });
}

test('the House slider at full brightens the picture', async ({ page }) => {
  const desk = await bootApp(page);
  await stepFrames(desk, 500, 2);
  const start = await viewerBrightness(page);
  await page.locator('#house').fill('100');
  await stepFrames(desk, 0);
  const full = await viewerBrightness(page);
  expect({ start, full, brighter: full > start + 1 }).toEqual({ start, full, brighter: true });
});
