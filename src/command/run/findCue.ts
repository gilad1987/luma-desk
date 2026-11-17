import { findCueIndex } from '../../engine/CueList';
import type { Executor } from '../../engine/Executor';
import { CommandError } from '../CommandError';

/** The index of cue `num` in `executor`, for Goto and Delete; both report a missing cue with the same text. */
export function findCue(executor: Executor, num: number): number {
  const index = findCueIndex(executor.cues, num);
  if (index < 0) throw new CommandError(`Cue ${num} not found`);
  return index;
}
