import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageFixture } from '../../domain/stage/StageDesign';

/** What the pairing reads of a link: its desk id at export and, for a fixture with MVR facts, its uuid key. */
interface KeyedLink {
  readonly id: number;
  readonly uuid?: string | undefined;
  readonly occurrence?: number | undefined;
}

const keyOf = (uuid: string, occurrence: number | undefined): string => `${uuid}#${String(occurrence ?? 0)}`;

/** The uuid of a link that names its fixture alone: not empty, on no other link, first of its file (review R2-2). */
function soleUuids(links: readonly KeyedLink[]): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const { uuid } of links) if (uuid) counts.set(uuid, (counts.get(uuid) ?? 0) + 1);
  const sole = links.filter(({ uuid, occurrence }) => uuid && counts.get(uuid) === 1 && !occurrence);
  return new Set(sole.map(({ uuid }) => uuid ?? ''));
}

/**
 * Each fixture's link, by the fixture's id after this import. A link with a sole uuid pairs only with the fixture of
 * that `<Fixture uuid>`: the desk id is no key across a round trip, because a pass-through keeps the file's own
 * `FixtureID` (empty, or the text from before a renumber), so the next import numbers again and a neighbour can take
 * the old id. Any other link pairs by id: one without a uuid (a fixture the desk added, or an export from before the
 * uuid), and one whose uuid is empty or shared, because then the occurrence is only file order, which a delete shifts.
 * Limit: a pass-through export of a file with empty or shared uuids keeps its empty `FixtureID`, so after a delete
 * such a link can still pair with a neighbour. MVR asks for unique uuids, so only a file that breaks it is affected.
 */
export function pairLinks<L extends KeyedLink>(
  fixtures: readonly StageFixture[],
  mvr: MvrDesignInfo | undefined,
  links: readonly L[],
): ReadonlyMap<number, L> {
  const sole = soleUuids(links);
  const keyed = (link: L): boolean => link.uuid !== undefined && sole.has(link.uuid);
  const byKey = new Map(links.filter(keyed).map((link) => [keyOf(link.uuid ?? '', link.occurrence), link]));
  const byId = new Map(links.filter((link) => !keyed(link)).map((link) => [link.id, link]));
  const pairs = fixtures.flatMap((fixture) => {
    const info = mvr?.fixtures[String(fixture.id)];
    const link = (info && byKey.get(keyOf(info.uuid, info.occurrence))) ?? byId.get(fixture.id);
    return link ? [[fixture.id, link] as const] : [];
  });
  return new Map(pairs);
}
