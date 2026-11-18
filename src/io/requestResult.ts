/**
 * The result of an IndexedDB request as a promise, because the IndexedDB API reports through event handlers and the
 * store code reads more clearly with `await`. A failed request rejects with its `error`.
 */
export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}
