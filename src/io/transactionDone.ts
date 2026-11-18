/**
 * Resolves when an IndexedDB transaction commits. A write waits for this and not for its request, because the
 * request can succeed while the transaction still aborts (quota), and the caller must know the bytes are on disk.
 */
export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = (): void => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}
