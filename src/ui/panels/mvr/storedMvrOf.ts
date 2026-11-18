import type { StageDesign } from '../../../domain/stage/StageDesign';
import type { MvrStore } from '../../../io/mvrStore';

/**
 * Where the original file of the active design stands at boot. `none`: the design is not an MVR import with a stored
 * file, so there is nothing to look for. `missing`: the show points at bytes this browser does not hold (another
 * machine, cleared storage), so the UI shows a toast and the Import prompt; the rig still loads from the design.
 * `found`: the bytes are there, so render can read the imported geometry again.
 */
export type StoredMvr =
  | { readonly kind: 'none' }
  | { readonly kind: 'missing'; readonly fileName: string }
  | { readonly kind: 'found'; readonly bytes: Uint8Array };

/** Looks up the stored `.mvr` bytes of `design` (the `missingMvr` step of plan §6); the store never rejects. */
export async function storedMvrOf(design: StageDesign, store: Pick<MvrStore, 'get'>): Promise<StoredMvr> {
  const { kind, fileHash, name } = design.source;
  if (kind !== 'mvr' || fileHash === undefined) return { kind: 'none' };
  const bytes = await store.get(fileHash);
  return bytes ? { kind: 'found', bytes } : { kind: 'missing', fileName: name };
}
