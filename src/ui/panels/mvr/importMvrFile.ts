import type { StageService } from '../../../engine/stage/StageService';
import type { MvrStore } from '../../../io/mvrStore';
import type * as MvrModule from '../../../mvr';
import type { MvrImport } from '../../../mvr';

/** The part of the parser chunk the import uses. */
type MvrParser = Pick<typeof MvrModule, 'importMvr' | 'MvrError'>;

/**
 * What the import needs from the desk; main.ts passes the real store and stage service. `loadParser` defaults to the
 * lazy chunk; tests pass one that rejects, to prove a chunk that does not load stores nothing.
 */
export interface MvrImportDeps {
  readonly store: Pick<MvrStore, 'put' | 'delete'>;
  readonly stage: Pick<StageService, 'apply'>;
  /**
   * Cancels an open Stage Builder session; a no-op when it is closed. It runs right before the apply, as for a show
   * load: the builder's Cancel and Done re-apply its own stage, so they must not come after the import.
   */
  readonly cancelBuilder: () => void;
  readonly loadParser?: () => Promise<MvrParser>;
}

const loadMvrChunk = (): Promise<MvrParser> => import('../../../mvr');

/**
 * How an import ended. `failed`: the file is not a usable MVR (`MvrError`); the stage is unchanged and `message` is
 * for the toast. `imported`: the stage is applied; `stored` is false when IndexedDB refused the bytes, so the UI can
 * warn that after a reload the file must be imported again.
 */
export type MvrImportOutcome =
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'imported'; readonly result: MvrImport; readonly stored: boolean };

/**
 * Imports a chosen `.mvr` file: load the parser, store the bytes, read them, then apply the design with cause
 * `import`. The parser is a lazy chunk (`import()`), so the boot bundle does not grow; it loads first, so a chunk that
 * does not load (offline, a new deploy) rejects before any bytes are stored. The bytes are stored before the apply,
 * because the apply saves the show, and a reload must never find a show whose file is not in IndexedDB. A file the
 * parser rejects is taken out of the store again; other errors are code bugs and reject.
 */
export async function importMvrFile(
  file: { readonly name: string; readonly bytes: Uint8Array<ArrayBuffer> },
  deps: MvrImportDeps,
): Promise<MvrImportOutcome> {
  const { importMvr, MvrError } = await (deps.loadParser ?? loadMvrChunk)();
  const hash = await deps.store.put(file.bytes);
  let result: MvrImport;
  try {
    result = await importMvr(file.bytes, hash === null ? { name: file.name } : { name: file.name, fileHash: hash });
  } catch (error) {
    if (!(error instanceof MvrError)) throw error;
    if (hash !== null) await deps.store.delete(hash);
    return { kind: 'failed', message: error.message };
  }
  deps.cancelBuilder();
  deps.stage.apply(result.design, 'import');
  return { kind: 'imported', result, stored: hash !== null };
}
