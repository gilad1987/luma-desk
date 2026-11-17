import type { Executor } from '../../../engine/Executor';

/** The three text lines of an executor card. */
export interface ExecutorCardText {
  readonly name: string;
  readonly cue: string;
  readonly next: string;
}

/**
 * The card texts of executor `i` (0-based): its name (or `Seq n` / `empty`), the current cue (or the cue count), and
 * the next cue while it runs.
 */
export function executorCardText(e: Executor, i: number): ExecutorCardText {
  const c = e.cues[e.cur],
    nx = e.cues.length ? e.cues[(e.cur + 1) % e.cues.length] : null;
  return {
    name: e.name || (e.cues.length ? `Seq ${i + 1}` : 'empty'),
    cue: c ? `${c.num} ${c.name}` : e.cues.length ? `${e.cues.length} cues` : '',
    next: nx && e.on ? `› ${nx.num} ${nx.name}` : '',
  };
}
