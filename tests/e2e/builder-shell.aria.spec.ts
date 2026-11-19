/**
 * The ARIA the builder sets on a `wa-button` host as Chromium's accessibility tree exposes it on the inner button: the
 * Hebrew help as the description with no `title` (so no native browser tooltip next to the `wa-tooltip`), and the
 * Inspector button's open state. The names and the mode radios are owned by builder-shell.a11y, the drawer's layout
 * and focus by builder-shell.drawer.
 */
import { expect, test } from '@playwright/test';
import { he } from '../../src/i18n/he';
import { bootApp, collectErrors, openBuilder } from '../shared/e2e';

// Bug: the help was the `title`, which wa-button passes to its inner button, so a hover showed the browser's own
// tooltip beside the wa-tooltip; the help must stay the description without any `title`
test('a bar button is described by its Hebrew help and has no title on the host or the inner button', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toHaveAccessibleDescription(he.builder.edit.undo);
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveAccessibleDescription(he.builder.done);
  const titles = await page.locator('[data-edit="undo"]').evaluate((host): string[] => {
    const inner = host.shadowRoot?.querySelector('[part~=base]');
    const title = (el: Element | null | undefined): string => (el instanceof HTMLElement ? el.title : 'not found');
    return [title(host), title(inner)];
  });
  expect([titles, errors]).toEqual([['', ''], []]);
});

// Bug: wa-button does not pass aria-expanded from its host to its inner button, so the Inspector button never told a
// screen reader whether the drawer it opens is open
test('narrow (1024 px): the Inspector button is expanded while the drawer is open and collapsed after', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await bootApp(page);
  await openBuilder(page);
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inspector', exact: true, expanded: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Inspector', exact: true, expanded: false })).toBeVisible();
  expect(errors).toEqual([]);
});
