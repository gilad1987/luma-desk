import { fileGelOf, hasColourPlan, isFileWhite } from '../../domain/stage/mvrGel';
import { fileColorOf } from '../../domain/stage/mvrFileData';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { fixtureCount, type FileDataLine } from './fileDataLine';

/**
 * The summary line about the fixtures' `<Color>`: how many carry one, and how many show it as their gel
 * (`fileGelOf`), at the level its `Y` states. One value on the whole rig is a writer's default and is named as
 * such, and so is white in a rig with a colour plan. No line without colours.
 */
export function colourLines(design: StageDesign): FileDataLine[] {
  const { mvr } = design;
  const infos = Object.values(mvr?.fixtures ?? {});
  const coloured = infos.filter((info) => info.color !== undefined).length;
  if (mvr === undefined || coloured === 0) return [];
  const count = fixtureCount(coloured);
  if (!hasColourPlan(mvr)) {
    const value = mvr.colors?.[0]?.xyY.join(', ') ?? '';
    const message = `${count} carry one colour from the file (${value}); one value for the whole rig is no colour plan, so the desk does not use it.`;
    return [{ kind: 'sameColour', count: coloured, message }];
  }
  const gels = infos.filter((info) => fileGelOf(mvr, info) !== undefined).length;
  const whites = infos.filter((info) => {
    const color = fileColorOf(mvr, info);
    return color !== undefined && isFileWhite(color);
  }).length;
  const shown =
    gels === 0
      ? 'no single-colour fixture with a trusted GDTF shows it as its gel'
      : `${fixtureCount(gels).replace('fixture', 'single-colour fixture')} ` +
        `${gels === 1 ? 'shows it as its gel' : 'show it as their gel'}, as bright as its Y states`;
  const carry = whites === 1 ? 'carries' : 'carry';
  const white = whites === 0 ? '' : ` ${whites} of them ${carry} white, a writer's default, which is no gel.`;
  return [{ kind: 'colour', count: coloured, message: `${count} carry a colour from the file; ${shown}.${white}` }];
}
