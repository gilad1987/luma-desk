import type { Executor } from '../engine/Executor';
import type { DemoShow } from './DemoShow';
import type { ShowFileInput } from './ShowFile';
import type { ShowSerializer } from './ShowSerializer';
import type { ShowStorage } from './ShowStorage';

/** What boot needs to bring back the last show. */
export interface RestoreShowDeps {
  readonly storage: ShowStorage;
  readonly serializer: ShowSerializer;
  readonly execs: readonly Executor[];
  readonly demo: DemoShow;
}

/**
 * Boot: loads the saved show, or the demo. Kept exactly as the original rules, quirks included: a saved show with no
 * cue at all counts as nothing saved, so the demo replaces it; when executor 1 has cues it starts cue 1 at once and
 * is raised to full if it was saved at 0; a broken or unreadable save also falls back to the demo.
 */
export function restoreShow({ storage, serializer, execs, demo }: RestoreShowDeps): void {
  let loaded = false;
  try {
    loaded = loadSaved(storage, serializer, execs);
  } catch {
    // unreadable storage or a broken save: the demo below replaces it
  }
  if (!loaded) demo.load();
}

/** Loads the saved show and starts executor 1; false when nothing is saved or the save holds no cue. */
function loadSaved(storage: ShowStorage, serializer: ShowSerializer, execs: readonly Executor[]): boolean {
  const saved = storage.saved();
  if (!saved) return false;
  serializer.load(JSON.parse(saved) as ShowFileInput);
  const loaded = execs.some((e) => e.cues.length);
  const first = execs[0];
  if (loaded && first?.cues.length) {
    first.goto(0, 0);
    if (!first.level) first.level = 1;
  }
  return loaded;
}
