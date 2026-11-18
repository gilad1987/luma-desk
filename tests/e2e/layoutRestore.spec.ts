/**
 * The saved layout at boot: LayoutManager.restore reads `lumadesk-layout2`, applies it and saves it back. A saved grip
 * size equal to MA_SIZE (0.47) reads as adaptive, so the save at the end of boot drops it; any other size stays. The
 * zoom is `.85`, the value the zoom select itself writes.
 */
import { expect, test } from '@playwright/test';
import { STORAGE_KEYS } from '../shared';
import { bootApp, collectErrors, readStoredJson } from '../shared/e2e';

const CASES = [
  { maSize: 0.47, saved: { deskMode: 'desk', deskZoom: '.85' } },
  { maSize: 0.55, saved: { deskMode: 'desk', deskZoom: '.85', maSize: 0.55 } },
];

for (const { maSize, saved } of CASES) {
  test(`boots in the saved desk layout and saves grip size ${maSize} back as ${JSON.stringify(saved)}`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const stored = JSON.stringify({ deskMode: 'desk', deskZoom: '.85', maSize });
    // registered before bootApp's own script, which leaves the layout key alone when no layout option is given
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: STORAGE_KEYS.layout,
      value: stored,
    });
    await bootApp(page);
    await expect(page.locator('body')).toHaveClass(/\bdesk\b/);
    await expect(page.locator('#deskZoom')).toHaveValue('.85');
    expect(await readStoredJson(page, STORAGE_KEYS.layout)).toStrictEqual(saved);
    expect(errors).toEqual([]);
  });
}
