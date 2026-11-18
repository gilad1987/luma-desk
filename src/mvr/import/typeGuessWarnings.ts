import type { FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import type { MvrWarning } from '../MvrWarning';
import { byCount } from '../byCount';

/**
 * One `type-from-name` warning per desk type that a fixture name chose over its GDTF (`classifyFixture`), with the
 * fixture count. Name words are a guess, so the user must see it, but one line per type keeps a show with a hundred
 * stand-in GDTFs readable. `ref` is the desk type id.
 */
export function typeGuessWarnings(counts: ReadonlyMap<FixtureTypeId, number>): MvrWarning[] {
  return [...counts].map(([type, count]) => {
    const name = TYPES[type].name;
    const one = `fixture has a GDTF that does not tell its kind; it is shown as "${name}" from its name`;
    const many = `fixtures have a GDTF that does not tell their kind; they are shown as "${name}" from their name`;
    const message = `${count} ${byCount(count, one, many)}.`;
    return { code: 'type-from-name', message, ref: type };
  });
}
