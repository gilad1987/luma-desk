import type { Executor } from '../engine/Executor';
import type { DemoShow } from './DemoShow';
import type { ShowSerializer } from './ShowSerializer';
import type { ShowStorage } from './ShowStorage';

/** What boot needs to bring back the last show. */
export interface RestoreShowDeps {
  readonly storage: ShowStorage;
  readonly serializer: ShowSerializer;
  readonly execs: readonly Executor[];
  readonly demo: DemoShow;
  /**
   * Repaints the desk after a load. It runs inside the fallback right after the saved show loads, as the original
   * loader repainted, so a saved show the desk cannot draw also falls back to the demo.
   */
  readonly repaint: () => void;
}

/**
 * Boot: loads the saved show, or the demo. Kept exactly as the original rules, quirks included: a saved show with no
 * cue at all counts as nothing saved, so the demo replaces it; when executor 1 has cues it starts cue 1 at once and
 * is raised to full if it was saved at 0; a broken or unreadable save also falls back to the demo. A save that loaded
 * with cues stays, even when starting executor 1 throws.
 */
export function restoreShow({ storage, serializer, execs, demo, repaint }: RestoreShowDeps): void {
  let loaded = false;
  try {
    const saved = storage.saved();
    if (saved) {
      serializer.load(JSON.parse(saved));
      repaint();
      loaded = execs.some((e) => e.cues.length); // quirk D1 (orig:3089): a show with no cue counts as nothing saved
      if (loaded) startFirstExec(execs);
    }
  } catch {
    // quirk D8, quirk D6 (orig:3089): unreadable storage or a broken save; the demo below replaces it, unless the
    // save already counted as loaded
  }
  if (loaded) return;
  demo.load();
  repaint();
}

/** Starts cue 1 of executor 1 when it has cues, raising a level saved at 0 to full. */
function startFirstExec(execs: readonly Executor[]): void {
  const first = execs[0];
  if (!first?.cues.length) return;
  first.goto(0, 0);
  if (!first.level) first.level = 1; // quirk D2 (orig:3089)
}
