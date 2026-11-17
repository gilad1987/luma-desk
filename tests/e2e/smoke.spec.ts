import { expect, test } from '@playwright/test';
import { bootApp, collectErrors, deskState, step } from '../shared';

test('boots with no console errors or page errors', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await step(page, 100, 3);
  expect(await page.evaluate(() => window.__desk.fixtures.length)).toBeGreaterThan(300);
  await expect(page.locator('#guide')).not.toHaveClass(/show/);
  expect(errors).toEqual([]);
});

test('GO+ steps through the demo cues', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  const exec1 = (await deskState(page)).execs[0];
  if (!exec1) throw new Error('no executor 1');
  expect(exec1.cues.length).toBeGreaterThanOrEqual(5);
  for (let k = 1; k <= 4; k++) {
    await page.locator('#goBig').click();
    await step(page, 6000); // past the longest demo fade
    const e = (await deskState(page)).execs[0];
    expect(e?.on).toBe(true);
    expect(e?.cur).toBe((exec1.cur + k) % exec1.cues.length);
    await expect(page.locator('#hudCue')).toContainText(exec1.cues[e?.cur ?? -1]?.[1] ?? '?');
  }
  expect(errors).toEqual([]);
});

test('command line selects and sets fixtures', async ({ page }) => {
  await bootApp(page);
  await page.locator('#cmd').fill('Fixture 201 Thru 230 At Full');
  await page.locator('#cmd').press('Enter');
  await expect(page.locator('#cmd')).toHaveValue('');
  await expect(page.locator('#cmdFb')).toContainText('30 fixtures At 100');
  const s = await deskState(page);
  expect(s.sel).toEqual(Array.from({ length: 30 }, (_, i) => 201 + i));
  for (const id of s.sel) expect(s.prog[id]).toEqual({ dim: 100 });
  await step(page);
  const dims = await page.evaluate(() =>
    window.__desk.fixtures.filter((f) => f.id >= 201 && f.id <= 230).map((f) => f.out.dim),
  );
  expect(new Set(dims)).toEqual(new Set([100]));
});

test('layout switch: ma, desk, classic', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await expect(page.locator('body')).toHaveClass(/\bma\b/);
  for (const mode of ['desk', 'classic', 'ma'] as const) {
    await page.locator('#layoutSel').selectOption(mode);
    await step(page);
    const cls = (await page.locator('body').getAttribute('class')) ?? '';
    expect(cls.includes('ma')).toBe(mode === 'ma');
    expect(cls.includes('desk')).toBe(mode === 'desk');
    expect((await deskState(page)).deskMode).toBe(mode);
    for (const id of ['#cmd', '#goBig', '#execs']) await expect(page.locator(id)).toBeVisible();
  }
  expect(errors).toEqual([]);
});
