/**
 * The Stage Builder bar's names as Chromium's accessibility tree exposes them: a toolbar named Stage Builder with an
 * Edit group and a polite count badge, and the controls' English names and Hebrew descriptions. The mode radios' Tab
 * stop and arrow keys are owned by builder-shell.radios, the bar's columns and 44 px targets by builder-shell.layout.
 */
import { expect, test, type Page } from '@playwright/test';
import { he } from '../../src/i18n/he';
import { bootApp, collectErrors, openBuilder } from '../shared/e2e';

const modes = (page: Page) => page.getByRole('radiogroup', { name: 'View' });

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
