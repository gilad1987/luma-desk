import type { StageService } from '../../../engine/stage/StageService';
import type { MvrStore } from '../../../io/mvrStore';
import type { MvrImport } from '../../../mvr';

/** What the import needs from the desk; main.ts passes the real store and stage service. */
export interface MvrImportDeps {
  readonly store: Pick<MvrStore, 'put' | 'delete'>;
  readonly stage: Pick<StageService, 'apply'>;
}

/**
 * How an import ended. `failed`: the file is not a usable MVR (`MvrError`); the stage is unchanged and `message` is
 * for the toast. `imported`: the stage is applied; `stored` is false when IndexedDB refused the bytes, so the UI can
 * warn that after a reload the file must be imported again.
 */
export type MvrImportOutcome =
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'imported'; readonly result: MvrImport; readonly stored: boolean };

/**
 * Imports a chosen `.mvr` file: store the bytes, read them, then apply the design with cause `import`. The bytes are
 * stored before the apply, because the apply saves the show, and a reload must never find a show whose file is not in
 * IndexedDB. The parser is a lazy chunk (`import()`), so the boot bundle does not grow. A file the parser rejects is
 * taken out of the store again; other errors are code bugs and reject.
 */
export async function importMvrFile(
  file: { readonly name: string; readonly bytes: Uint8Array<ArrayBuffer> },
  deps: MvrImportDeps,
): Promise<MvrImportOutcome> {
  const hash = await deps.store.put(file.bytes);
  const { importMvr, MvrError } = await import('../../../mvr');
  let result: MvrImport;
  try {
    result = await importMvr(file.bytes, hash === null ? { name: file.name } : { name: file.name, fileHash: hash });
  } catch (error) {
    if (!(error instanceof MvrError)) throw error;
    if (hash !== null) await deps.store.delete(hash);
    return { kind: 'failed', message: error.message };
  }
  deps.stage.apply(result.design, 'import');
  return { kind: 'imported', result, stored: hash !== null };
}
