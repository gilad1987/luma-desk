import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageFixture } from '../../domain/stage/StageDesign';

/** What the pairing reads of a link: its desk id at export and, for a fixture with MVR facts, its uuid key. */
interface KeyedLink {
  readonly id: number;
  readonly uuid?: string | undefined;
  readonly occurrence?: number | undefined;
}

const keyOf = (uuid: string, occurrence: number | undefined): string => `${uuid}#${String(occurrence ?? 0)}`;

/**
 * Each fixture's link, by the fixture's id after this import. A link with a uuid pairs only with the fixture of that
 * `<Fixture uuid>` and occurrence: the desk id is no key across a round trip, because a pass-through keeps the file's
 * own `FixtureID` (empty, or the text from before a renumber), so the next import numbers again and a neighbour can
 * take the old id. A link without a uuid (a fixture the desk added, or an export from before the uuid) pairs by id.
 */
export function pairLinks<L extends KeyedLink>(
  fixtures: readonly StageFixture[],
  mvr: MvrDesignInfo | undefined,
  links: readonly L[],
): ReadonlyMap<number, L> {
  const byKey = new Map(
    links.flatMap((link) => (link.uuid === undefined ? [] : [[keyOf(link.uuid, link.occurrence), link]])),
  );
  const byId = new Map(links.filter((link) => link.uuid === undefined).map((link) => [link.id, link]));
  const pairs = fixtures.flatMap((fixture) => {
    const info = mvr?.fixtures[String(fixture.id)];
    const link = (info && byKey.get(keyOf(info.uuid, info.occurrence))) ?? byId.get(fixture.id);
    return link ? [[fixture.id, link] as const] : [];
  });
  return new Map(pairs);
}
