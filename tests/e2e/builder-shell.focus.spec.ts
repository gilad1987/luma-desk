/**
 * Where the keyboard focus goes in a real browser when the edit toolbar turns off the `wa-button` that has it: to an
 * enabled neighbour, after Web Awesome rendered that neighbour. Which neighbour, in jsdom, is owned by
 * EditToolbar.focus.test; the toolbar's names and descriptions by builder-shell.names.
 */
import { expect, test, type Page } from '@playwright/test';
import { bootApp, collectErrors, openBuilder } from '../shared/e2e';

/** Adds one straight truss from the Trusses tab; it becomes the selection, so Delete turns on. */
async function addTruss(page: Page): Promise<void> {
  // a class: the inspector column is one of three unnamed <aside> elements, so no role fits
  const tools = page.locator('.builder-inspector');
  await tools.getByRole('tab', { name: 'Trusses' }).click();
  await tools.getByRole('tabpanel', { name: 'Trusses' }).getByRole('button', { name: 'Straight', exact: true }).click();
}

/** The focused toolbar action, and whether the focus is on that host's enabled inner button. */
function focusedEdit(page: Page): Promise<[string | null, boolean]> {
  return page.evaluate((): [string | null, boolean] => {
    const host = document.activeElement;
    const inner = host?.shadowRoot?.activeElement;
    return [host?.getAttribute('data-edit') ?? null, inner?.matches('[part~="base"]:not([disabled])') ?? false];
  });
}

// Bug: the last Undo turned Redo on as a property, but Lit renders it a microtask later, so focusing Redo at once hit
// its still-disabled inner button and the focus fell to <body>
test('Enter on the last Undo gives the focus to Redo, not to the page', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  // the chosen template and venue are the visit's one edit, so this Undo is the last
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeEnabled();
  await undo.focus();
  await page.keyboard.press('Enter');
  await expect(undo).toBeDisabled();
  await expect.poll(() => focusedEdit(page)).toEqual(['redo', true]);
  expect(errors).toEqual([]);
});

// Bug: Delete empties the selection and turns its own focused button off, which dropped the focus to <body>
test('Enter on Delete gives the focus to the next enabled button, Mirror', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  await addTruss(page);
  const remove = page.getByRole('button', { name: 'Delete', exact: true });
  await expect(remove).toBeEnabled();
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(remove).toBeDisabled();
  await expect.poll(() => focusedEdit(page)).toEqual(['mirror', true]);
  expect(errors).toEqual([]);
});
