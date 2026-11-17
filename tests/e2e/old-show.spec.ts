import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jsonRoundTrip, readGolden, type SavedShow } from '../shared';
import { bootApp, collectErrors, readDeskState } from '../shared/e2e';

/** Groups added after the first release; loadShow() puts them into old shows, but only into empty slots. */
const NEW_GROUPS = ['LED Bars', 'Follow Spots', 'Profiles'];
const DEMO_GROUPS = (readGolden('demo-show') as SavedShow).groups;

// Each file is localStorage lumadesk-show-v6 byte for byte, saved without ?test by an older app after the demo show
// loaded and "Fixture 201 Thru 230 At Full", "Store Cue 5 Fade 3 Exec 2" ran (cue 5 added to exec 2 "Blinders").
// old-show-v1 comes from the app just before the refactor; old-show-38efd21 from the first release, which had no
// LED Bars / Follow Spots / Profiles groups.
const SAVED_SHOWS = [
  { file: 'old-show-v1.json', addedGroups: [] as string[] },
  { file: 'old-show-38efd21.json', addedGroups: NEW_GROUPS },
];

for (const { file, addedGroups } of SAVED_SHOWS) {
  test(`a show saved by an older app loads: ${file}`, async ({ page }) => {
    const raw = readFileSync(join(import.meta.dirname, '..', 'fixtures', file), 'utf8');
    const old = JSON.parse(raw) as SavedShow;
    const errors = collectErrors(page);
    const desk = await bootApp(page, { show: raw });

    const s = await readDeskState(desk);
    // boot goes to cue 1 of exec 1
    expect([s.execs[0]?.on, s.execs[0]?.cur]).toEqual([true, 0]);
    expect(s.execs[1]?.cues).toContainEqual([5, 'Cue 5', 3]);

    const now = jsonRoundTrip(await desk.evaluate((d) => d.serialize())) as SavedShow;
    const newSlots = Object.keys(now.groups).filter((slot) => !(slot in old.groups));
    expect(newSlots.map((slot) => now.groups[slot]?.name)).toEqual(addedGroups);
    const added = Object.fromEntries(newSlots.map((slot) => [slot, DEMO_GROUPS[slot]]));
    expect(now).toStrictEqual({ ...old, groups: { ...old.groups, ...added } });
    expect(errors).toEqual([]);
  });
}
