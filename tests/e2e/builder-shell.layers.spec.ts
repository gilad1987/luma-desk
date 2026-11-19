/**
 * The Stage Builder's stacking against the page's own layers: the "MVR file missing" prompt stays reachable over the
 * open builder. The builder's columns are owned by builder-shell.layout, the prompt's text and buttons by mvr-keep.
 */
import { expect, test } from '@playwright/test';
import { bootApp, collectErrors, openBuilder } from '../shared/e2e';

// Bug: the prompt and the builder both had z-index 40 and the builder comes later in body, so it covered the prompt
test('the "MVR file missing" prompt shows over the open builder', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page);
  await openBuilder(page);
  // the prompt shows only for a saved stage whose file is gone; the test shows it with a line of text instead. An id:
  // the prompt is a role="alert" slot with no name, and an empty alert has no text to find it by.
  const prompt = page.locator('#mvrMissingPrompt');
  await prompt.evaluate((el: HTMLElement) => {
    el.textContent = 'The MVR file of this stage is missing.';
    el.hidden = false;
  });
  await expect(prompt).toBeVisible();
  const onTop = await prompt.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    if (hit?.closest('#mvrMissingPrompt')) return 'prompt';
    return hit?.closest('section.builder') ? 'builder' : 'other';
  });
  expect([onTop, errors]).toEqual(['prompt', []]);
});
