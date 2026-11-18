import type { StageDesign, StageFixture } from '../../../domain/stage/StageDesign';
import { fixtureKey } from '../../design/fixtureKey';
import { keyedElements, legacyPairs } from './legacyPairs';

/** One `<Fixture>` element of the original scene and the desk fixture it belongs to. */
export interface FileMatch {
  readonly element: Element;
  /** `uuid#occurrence`, the same key the import stored. */
  readonly key: string;
  readonly fixture: StageFixture | undefined;
  /** True when the import made a desk fixture of it and the desk no longer has it: the user deleted it. */
  readonly deleted: boolean;
}

/** The pairing of the original elements with the desk fixtures. */
export interface FixtureMatch {
  readonly matches: readonly FileMatch[];
  /** Desk fixtures no element belongs to: added on the desk. */
  readonly added: readonly StageFixture[];
  /** The show predates the list of imported elements, so no element can be known as deleted. */
  readonly legacy: boolean;
}

/** The desk fixtures by the key the import stored for each. */
function recorded(design: StageDesign): Map<string, StageFixture> {
  const desk = new Map<string, StageFixture>();
  for (const fixture of design.fixtures) {
    const info = design.mvr?.fixtures[String(fixture.id)];
    const key = info && fixtureKey(info.uuid, info.occurrence ?? 0);
    if (key !== undefined && !desk.has(key)) desk.set(key, fixture);
  }
  return desk;
}

/**
 * Pairs elements and desk fixtures by uuid and by which element with that uuid it is, so a file that repeats a uuid
 * still gets each edit on its own element. An element without a desk fixture is deleted only when the import listed
 * it as a desk fixture; anything else (an object-typed fixture, a show saved before the list) stays. `ids` holds the
 * usable file ids, which pair the twins of a show without the record (`legacyPairs`).
 */
export function matchFixtures(
  elements: readonly Element[],
  design: StageDesign,
  ids: ReadonlyMap<Element, number>,
): FixtureMatch {
  const imported = design.mvr?.imported;
  const items = keyedElements(elements);
  const desk = imported === undefined ? legacyPairs(items, design, ids) : recorded(design);
  const listed = new Set(imported ?? []);
  const matches = items.map(({ element, key }) => {
    const fixture = desk.get(key);
    return { element, key, fixture, deleted: !fixture && listed.has(key) };
  });
  const paired = new Set(matches.flatMap((match) => (match.fixture ? [match.fixture] : [])));
  const added = design.fixtures.filter((fixture) => !paired.has(fixture));
  return { matches, added, legacy: imported === undefined };
}
