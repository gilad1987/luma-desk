/**
 * The Stage Builder bar as Chromium's accessibility tree exposes it: the Plan, Split and 3D radio group (one Tab stop,
 * the arrow keys). The bar's columns and 44 px targets are owned by builder-shell.layout; what a mode does to the
 * centre by builder-shell.divider.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors, openBuilder } from '../shared/e2e';

const modes = (page: Page) => page.getByRole('radiogroup', { name: 'View' });

// Bug: the name sat on the wa-button's inner button, the radio role and aria-checked on its host, and the arrow keys
// did nothing, so a screen reader heard a plain "Split, button" and never which mode was on
test('the mode group is one Tab stop whose focused radio has the name and the checked state', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  const split = modes(page).getByRole('radio', { name: 'Split', exact: true });
  await expect(split).toBeFocused();
  await expect(split).toHaveAccessibleName('Split');
  await expect(split).toHaveAttribute('aria-checked', 'true');

  await page.keyboard.press('ArrowRight');
  const threeD = modes(page).getByRole('radio', { name: '3D', exact: true, checked: true });
  await expect(threeD).toBeFocused();
  await expect(threeD).toHaveAccessibleName('3D');
  // a class: the centre is a plain <div> with no role or name
  await expect(page.locator('.builder-centre')).toHaveClass(/\bis-mode-3d\b/);
  const tabStops = await modes(page)
    .getByRole('radio')
    .evaluateAll((all) => all.map((radio) => radio.getAttribute('tabindex')));
  expect([tabStops, errors]).toEqual([['-1', '-1', '0'], []]);
});
