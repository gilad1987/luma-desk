/**
 * The builder bar's Plan, Split and 3D radio group as Chromium shows it: one Tab stop with the arrow keys, the name
 * and the checked state on the focused radio, and the group's corners and shared borders. The other controls' names
 * and descriptions are owned by builder-shell.names, the bar's columns and 44 px targets by builder-shell.layout, what
 * a mode does to the centre by builder-shell.divider.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, boxOf, collectErrors, offBy, openBuilder } from '../shared/e2e';

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

// Bug: wa-button-group rounds only its last child, and a trailing wa-tooltip was that child, so 3D had square corners
test('the mode group rounds its outer corners only: Plan at the start, 3D at the end', async ({ page }) => {
  await bootApp(page);
  await openBuilder(page);
  const corners = await modes(page)
    .getByRole('radio')
    .evaluateAll((all) =>
      all.map((radio) => {
        const style = getComputedStyle(radio);
        return [
          style.borderStartStartRadius,
          style.borderEndStartRadius,
          style.borderStartEndRadius,
          style.borderEndEndRadius,
        ];
      }),
    );
  expect(corners).toEqual([
    ['4px', '4px', '0px', '0px'],
    ['0px', '0px', '0px', '0px'],
    ['0px', '0px', '4px', '4px'],
  ]);
});

// Bug: the outlined buttons sat edge to edge, so two 1 px borders drew a 2 px line between the modes
test('neighbouring mode radios share one 1 px border', async ({ page }) => {
  await bootApp(page);
  await openBuilder(page);
  const [planX, , planWidth] = await boxOf(modes(page).getByRole('radio', { name: 'Plan', exact: true }));
  const [splitX] = await boxOf(modes(page).getByRole('radio', { name: 'Split', exact: true }));
  expect(offBy([splitX], [planX + planWidth - 1], 0.5)).toEqual([0]);
});
