import type { StageFixture, StageScreen } from '../../domain/stage/StageDesign';
import type { MvrWarning } from '../MvrWarning';

/** What `relinkScreens` gives: the walls on their drivers of this import, and the walls it had to drop. */
export interface RelinkedScreens {
  readonly screens: readonly StageScreen[];
  readonly warnings: readonly MvrWarning[];
}

/**
 * The LED walls of the luma data, each on its driver fixture of this import. A wall names its driver by the desk id
 * at export, which a round trip can change as it changes a link's (review R2-2), so the id goes through the driver's
 * paired link: `links` maps each fixture's id now to its link, which holds the id at export. A link without a sole uuid
 * (an older export, a blank or shared uuid) pairs by id, so its walls keep their ids as before. A wall whose driver link paired with no fixture,
 * or whose driver is no `screen` fixture now, is dropped with a `missing-screen-driver` warning, because the rig
 * needs that driver to light it and the luma data reader could only check stand-ins.
 */
export function relinkScreens(
  screens: readonly StageScreen[],
  fixtures: readonly StageFixture[],
  links: ReadonlyMap<number, { readonly id: number }>,
): RelinkedScreens {
  const idNow = new Map([...links].map(([id, link]) => [link.id, id]));
  const drivers = new Set(fixtures.filter((fixture) => fixture.type === 'screen').map((fixture) => fixture.id));
  const kept: StageScreen[] = [];
  const warnings: MvrWarning[] = [];
  for (const screen of screens) {
    const fixtureId = idNow.get(screen.fixtureId);
    if (fixtureId !== undefined && drivers.has(fixtureId)) {
      kept.push({ ...screen, fixtureId });
      continue;
    }
    warnings.push({
      code: 'missing-screen-driver',
      message: `LED wall ${screen.id} was dropped: its driver fixture ${screen.fixtureId} is not in the file.`,
      ref: screen.id,
    });
  }
  return { screens: kept, warnings };
}
