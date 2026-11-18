import type { JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';

/**
 * The fixture ids the saved show's cues, effects and groups address that are not on the current rig. A rig change
 * must leave none: a dead id is a value the show would send to a fixture that no longer exists, or to another one.
 */
export function deadFixtureIds(desk: JSHandle<DeskTestApi>): Promise<number[]> {
  return desk.evaluate((d) => {
    const rig = new Set(window.__desk.fixtures.map((f) => f.id));
    const show = d.serialize();
    const fxIds = (fx: unknown): number[] =>
      typeof fx === 'object' && fx !== null && 'ids' in fx && Array.isArray(fx.ids) ? fx.ids.map(Number) : [];
    const cueIds = show.execs.flatMap((e) =>
      e.cues.flatMap((c) => [...Object.keys(c.vals).map(Number), ...c.fx.flatMap(fxIds)]),
    );
    const groupIds = Object.values(show.groups).flatMap((g) => g.ids);
    return [...new Set([...cueIds, ...groupIds])].filter((id) => !rig.has(id));
  });
}
