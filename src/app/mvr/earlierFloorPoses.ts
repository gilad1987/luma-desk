import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import type { KeyValueStore } from '../../show';
import { browserStore } from '../shared';

/** The `<Fixture uuid>` of a fixture of an imported design; undefined for a fixture the file does not hold. */
const uuidOf = (design: StageDesign, id: number): string | undefined => design.mvr?.fixtures[String(id)]?.uuid;

/**
 * How many floor fixtures of a saved stage stand in the desk's floor pose although the file gives their body an
 * orientation of its own. A stage saved before the import kept that orientation has no `rotation` on a turned-over
 * unit, so its body is drawn half a turn about the vertical off the file. The saved stage is not changed on load: its
 * presets and cues hold pan values in the old pose (the floor formula mirrors the body frame), and a new `rotation`
 * would aim every one of them the wrong way. `fresh` is the same file imported now; fixtures match by MVR uuid.
 */
export function earlierFloorPoses(saved: StageDesign, fresh: StageDesign): number {
  const turned = new Set(
    fresh.fixtures.filter((fixture) => fixture.rotation).map((fixture) => uuidOf(fresh, fixture.id)),
  );
  return saved.fixtures.filter((fixture) => {
    const uuid = uuidOf(saved, fixture.id);
    return fixture.mount === 'floor' && !fixture.rotation && uuid !== undefined && turned.has(uuid);
  }).length;
}

/** The store key of the count the notice was last shown with; the file hash (or the file name) follows it. */
const NOTICE_KEY = 'luma.mvr.earlierFloorPoses.';

/**
 * Tells the user about the floor fixtures in the earlier orientation (`earlierFloorPoses`), once per saved stage and
 * not on every boot. The text also warns that a new import mirrors the stored pan and tilt of those units front to
 * back, so the user does not import again without knowing what it costs. The count last shown is kept per file in
 * the browser store, where the shows and the guide flag are; the notice comes again only when the count changes. A
 * store that throws (storage blocked or full) leaves the notice on every boot, which is better than never.
 */
export function noteEarlierFloorPoses(
  saved: StageDesign,
  fresh: StageDesign,
  toast: (text: string) => void,
  store: KeyValueStore = browserStore,
): void {
  const count = earlierFloorPoses(saved, fresh);
  if (count === 0) return;
  const key = NOTICE_KEY + (saved.source.fileHash ?? saved.source.name);
  try {
    if (store.getItem(key) === String(count)) return;
    store.setItem(key, String(count));
  } catch {
    // the notice is shown: the flag could not be read or kept
  }
  toast(he.mvr.earlierFloorPoses(count));
}
