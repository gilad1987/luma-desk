import { expect, test } from '@playwright/test';
import { STORAGE_KEYS, bootApp, collectErrors, readDeskState, readStoredJson, stepFrames } from '../shared';

test('boots with no console errors or page errors', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await stepFrames(desk, 100, 3);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBeGreaterThan(300);
  await expect(page.locator('#guide')).not.toHaveClass(/\bshow\b/);
  expect(errors).toEqual([]);
});

test('GO+ steps through the demo cues', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const exec1 = (await readDeskState(desk)).execs[0];
  if (!exec1) throw new Error('no executor 1');
  expect(exec1.cues.length).toBeGreaterThanOrEqual(5);
  for (let k = 1; k <= 4; k++) {
    await page.locator('#goBig').click();
    await stepFrames(desk, 6000); // past the longest demo fade
    const e = (await readDeskState(desk)).execs[0];
    expect(e?.on).toBe(true);
    expect(e?.cur).toBe((exec1.cur + k) % exec1.cues.length);
    await expect(page.locator('#hudCue')).toContainText(exec1.cues[e?.cur ?? -1]?.[1] ?? '?');
  }
  expect(errors).toEqual([]);
});

test('command line selects and sets fixtures', async ({ page }) => {
  const desk = await bootApp(page);
  await page.locator('#cmd').fill('Fixture 201 Thru 230 At Full');
  await page.locator('#cmd').press('Enter');
  await expect(page.locator('#cmd')).toHaveValue('');
  await expect(page.locator('#cmdFb')).toContainText('30 fixtures At 100');
  const s = await readDeskState(desk);
  expect(s.sel).toEqual(Array.from({ length: 30 }, (_, i) => 201 + i));
  for (const id of s.sel) expect(s.prog[id]).toEqual({ dim: 100 });
  await stepFrames(desk);
  const dims = await page.evaluate(() =>
    window.__desk.fixtures.filter((f) => f.id >= 201 && f.id <= 230).map((f) => f.out.dim),
  );
  expect(new Set(dims)).toEqual(new Set([100]));
});

test('layout switch: ma, desk, classic', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  const bodyClasses = () => page.locator('body').evaluate((b) => Array.from(b.classList));
  expect(await bodyClasses()).toContain('ma');
  for (const mode of ['desk', 'classic', 'ma'] as const) {
    await page.locator('#layoutSel').selectOption(mode);
    await stepFrames(desk);
    const classes = await bodyClasses();
    expect(classes.includes('ma')).toBe(mode === 'ma');
    expect(classes.includes('desk')).toBe(mode === 'desk');
    expect((await readDeskState(desk)).deskMode).toBe(mode);
    // the next visit boots in the layout chosen here
    expect(await readStoredJson(page, STORAGE_KEYS.layout)).toStrictEqual({
      deskMode: mode,
      deskZoom: 'auto',
    });
    for (const id of ['#cmd', '#goBig', '#execs']) await expect(page.locator(id)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('STORE turns store mode on and off on the key and the page', async ({ page }) => {
  await bootApp(page);
  const store = page.locator('#kStore');
  await store.click();
  await expect(store).toHaveClass(/\bon\b/);
  await expect(page.locator('body')).toHaveClass(/\bstoring\b/);
  await store.click();
  await expect(store).not.toHaveClass(/\bon\b/);
  await expect(page.locator('body')).not.toHaveClass(/\bstoring\b/);
});
