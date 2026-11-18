import type { Page } from '@playwright/test';

/** The IndexedDB database and store that keep the `.mvr` bytes by SHA-256 (`src/io/mvrStore.ts`). */
const MVR_DB = { name: 'lumadesk-mvr', store: 'files' } as const;

/**
 * Counts the `.mvr` files this browser holds; 0 when the app never opened the database. A missing database is not
 * created here, because the app's own upgrade would then never run.
 */
export function countStoredMvrFiles(page: Page): Promise<number> {
  return page.evaluate(
    (db) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open(db.name);
        open.onupgradeneeded = () => open.transaction?.abort();
        open.onerror = () => resolve(0);
        open.onsuccess = () => {
          const count = open.result.transaction(db.store).objectStore(db.store).count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error ?? new Error('count of stored MVR files failed'));
          count.transaction?.addEventListener('complete', () => open.result.close());
        };
      }),
    MVR_DB,
  );
}
