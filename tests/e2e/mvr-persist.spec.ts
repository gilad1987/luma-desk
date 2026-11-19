import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING } from '../shared';
import { SYNTHETIC_MVR, bootApp, collectErrors, pickMvrFile, readMvrStage, waitForTestApi } from '../shared/e2e';

/** The IndexedDB database and store that keep the `.mvr` bytes by SHA-256 (plan v2, `src/io/mvrStore.ts`). */
const MVR_DB = { name: 'lumadesk-mvr', store: 'files' } as const;

/** The part of the stored show this spec reads: the MVR stage names its file by hash. */
interface StoredShow {
  stage?: { source: { fileHash?: string } };
}

/**
 * Waits until both stores hold the import, so a reload never tests a half-saved import. The show is saved 500 ms
 * after a change on a real timer, so this polls for the file hash in it. The bytes go to IndexedDB before the stage
 * changes; the check after the poll proves they are there. The poll is synchronous: a predicate that returns a
 * promise counts as truthy at once and would let the reload run before the save.
 */
async function waitForStoredMvr(page: Page): Promise<void> {
  const hashOf = (key: string): string | undefined =>
    (JSON.parse(localStorage.getItem(key) ?? '{}') as StoredShow).stage?.source.fileHash;
  await page.waitForFunction(hashOf, STORAGE_KEYS.show, TIMER_POLLING);
  const args = { hash: await page.evaluate(hashOf, STORAGE_KEYS.show), db: MVR_DB };
  const stored = ({ hash, db }: typeof args): Promise<boolean> =>
    new Promise((resolve) => {
      if (hash === undefined) return resolve(false);
      const open = indexedDB.open(db.name);
      // a missing database must not be created here: the app's own upgrade would then never run
      open.onupgradeneeded = () => open.transaction?.abort();
      open.onerror = () => resolve(false);
      open.onsuccess = () => {
        const count = open.result.transaction(db.store).objectStore(db.store).count(hash);
        count.onsuccess = () => resolve(count.result > 0);
        count.transaction?.addEventListener('complete', () => open.result.close());
      };
    });
  expect(await page.evaluate(stored, args)).toBe(true);
}

/** The ids of the rig the desk drives now, read at each call (`__desk.fixtures` is a getter). */
const liveRigIds = (page: Page): Promise<number[]> => page.evaluate(() => window.__desk.fixtures.map((f) => f.id));

test('a reload restores the MVR rig from IndexedDB', async ({ page }) => {
  const errors = collectErrors(page);
  let desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  const imported = await readMvrStage(desk);
  await waitForStoredMvr(page);

  await page.reload();
  desk = await waitForTestApi(page);
  await desk.evaluate((d) => d.mvrReady());
  expect(await readMvrStage(desk)).toEqual(imported);
  expect(await liveRigIds(page)).toEqual([101, 102]);
  await expect(page.locator('#mvrMissingPrompt')).toBeHidden();
  await expect(page.locator('#showName')).toHaveText('Synthetic');
  expect(errors).toEqual([]);
});

test('without the stored file a reload still builds the rig and asks for the file again', async ({ page }) => {
  const errors = collectErrors(page);
  let desk = await bootApp(page);
  await pickMvrFile(page, desk, SYNTHETIC_MVR);
  const imported = await readMvrStage(desk);
  await waitForStoredMvr(page);
  // the app closes its connection on versionchange, so the delete is not left blocked; wait for its success
  await page.evaluate(
    (name) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error(`deleteDatabase ${name} failed`));
      }),
    MVR_DB.name,
  );

  await page.reload();
  desk = await waitForTestApi(page);
  await desk.evaluate((d) => d.mvrReady());
  await expect(page.locator('#mvrMissingPrompt')).toContainText(SYNTHETIC_MVR.name);
  // the scenery never loads without the file, but the title follows the stage
  await expect(page.locator('#showName')).toHaveText('Synthetic');
  expect(await readMvrStage(desk)).toEqual(imported);
  expect(await liveRigIds(page)).toEqual([101, 102]);
  expect(errors).toEqual([]);
});
