/**
 * The Stage Builder bar as Chromium's accessibility tree exposes it: the Plan, Split and 3D radio group (one Tab stop,
 * the arrow keys) and the controls' English names and Hebrew descriptions. The bar's columns and 44 px targets are owned by builder-shell.layout; what a mode does to the
 * centre by builder-shell.divider.
 */
import { expect, test, type Page } from '@playwright/test';
import { he } from '../../src/i18n/he';
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

// Bug: each wa-tooltip put its id in the aria-labelledby of the wa-button host, which has no role, so the focused inner
// button had no description and a screen reader never heard the Hebrew help or the shortcut
test('a bar control is named by its English label and described by its Hebrew help', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  const controls = [
    [page.getByRole('button', { name: 'Undo', exact: true }), 'Undo', he.builder.edit.undo],
    [page.getByRole('button', { name: 'Done', exact: true }), 'Done', he.builder.done],
    [modes(page).getByRole('radio', { name: 'Plan', exact: true }), 'Plan', he.builder.shell.modePlan],
  ] as const;
  for (const [control, name, help] of controls) {
    await expect(control).toHaveAccessibleName(name);
    await expect(control).toHaveAccessibleDescription(help);
  }
  expect(errors).toEqual([]);
});

// Bug: the bar was a plain <header> and the badge a plain <span>, so a screen reader heard no toolbar and no new count
test('the bar is a toolbar named Stage Builder with an Edit group and a polite count badge', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  const bar = page.getByRole('toolbar', { name: 'Stage Builder' });
  await expect(
    bar.getByRole('group', { name: 'Edit' }).getByRole('button', { name: 'Undo', exact: true }),
  ).toBeVisible();
  // a class: the badge is a live region with no role of its own
  await expect(bar.locator('.count-badge')).toHaveAttribute('aria-live', 'polite');
  expect(errors).toEqual([]);
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
