import type { StillCursor } from './StillCursor';

/** A thrown value, boxed so that a thrown `undefined` still counts as a failure; null when the frame went well. */
export type FrameFailure = { readonly error: unknown } | null;

/**
 * Runs the steps of one frame between a state save and its restore: at most `budgetMs`, at least one step, and none
 * after a step whose work was not ready. An
 * error from the save, a step or the restore ends the frame as a failure (the first one wins), so the caller always
 * reaches its failure path and the target is freed even when the renderer state could not be saved or restored.
 */
export function runFrameSteps<O>(
  cursor: StillCursor<O>,
  saveState: () => () => void,
  now: () => number,
  budgetMs: number,
): FrameFailure {
  const started = now();
  let failure: FrameFailure = null;
  let restore = (): void => undefined;
  let ready = true;
  try {
    restore = saveState();
    // a work that is not ready (the GPU is still busy) ends the frame; the next frame asks again
    do ready = cursor.step();
    while (ready && cursor.stepping && now() - started < budgetMs);
  } catch (error) {
    failure = { error };
  }
  try {
    restore();
  } catch (error) {
    failure ??= { error };
  }
  return failure;
}
