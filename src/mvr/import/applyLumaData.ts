import type { MvrDesignInfo, MvrFixtureInfo } from '../../domain/stage/mvr';
import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import type { FixtureLink, LinkFootprint, LumaStageData } from '../luma/lumaData';
import type { MvrWarning } from '../MvrWarning';

/** One link split once: its desk fields go onto the fixture, its footprint (MVR data) into the MVR facts. */
interface SplitLink {
  readonly desk: Omit<FixtureLink, 'footprint'>;
  readonly footprint: LinkFootprint | undefined;
}

/**
 * Splits by a rest destructure, so this step needs no change for a desk field added to `FixtureLink` later. The field
 * must still be added to `linkOf` (export) and `LINK_FIELDS` (stand-in check), or it never reaches the fixture.
 */
function splitLink({ footprint, ...desk }: FixtureLink): SplitLink {
  return { desk, footprint };
}

/**
 * The fixture with the desk fields the luma data gives for its id, or unchanged when it gives none. The link's
 * `fixed` and `pixel` replace the fixture's own, so a fixture without them in the data has none after the import.
 */
function relink(fixture: StageFixture, links: ReadonlyMap<number, SplitLink>): StageFixture {
  const link = links.get(fixture.id);
  if (!link) return fixture;
  const { position, rotation, patch } = fixture;
  return { ...link.desk, position, ...(rotation ? { rotation } : {}), ...(patch ? { patch } : {}) };
}

/** Two GDTF names as `modeChannels` matches them: exactly, or equal after trimming, as writers pad names. */
const sameName = (a: string, b: string): boolean => a === b || a.trim() === b.trim();

/**
 * The link's footprint when the `<Fixture>` still names the GDTF spec and mode it was measured for. Another tool may
 * change them and keep the desk's `<UserData>`; the old count would then pass as known and hide real overlaps.
 */
function linkFootprint(info: MvrFixtureInfo, link: SplitLink | undefined): number | undefined {
  const footprint = link?.footprint;
  if (footprint === undefined) return undefined;
  const same = sameName(footprint.gdtfSpec, info.gdtfName) && sameName(footprint.gdtfMode, info.gdtfMode);
  return same ? footprint.channels : undefined;
}

/**
 * The MVR facts with each fixture's `type` set to the type it has now. The import guessed a type without a GDTF
 * file, and the luma data then restored the desk type; the export reads a type mismatch as "the user re-typed the
 * fixture" and drops the file's GDTF name and mode, so the stored type must be the restored one. A footprint read
 * from a GDTF file in this archive wins; else the link's footprint comes back (`linkFootprint`), as a desk export
 * holds no GDTF file.
 */
function retype(
  mvr: MvrDesignInfo,
  fixtures: readonly StageFixture[],
  links: ReadonlyMap<number, SplitLink>,
): MvrDesignInfo {
  const entries = fixtures.flatMap((fixture) => {
    const info = mvr.fixtures[String(fixture.id)];
    const footprint = info && (info.footprint ?? linkFootprint(info, links.get(fixture.id)));
    const kept = info && { ...info, type: fixture.type, ...(footprint === undefined ? {} : { footprint }) };
    return kept ? [[String(fixture.id), kept] as const] : [];
  });
  return { ...mvr, fixtures: Object.fromEntries(entries) };
}

/** What `applyLumaData` gives: the restored design and the walls it had to drop. */
export interface LumaApplied {
  readonly design: StageDesign;
  readonly warnings: readonly MvrWarning[];
}

/**
 * The imported design with the stage a luma export stored: venue, scenery, deck, LED walls, risers, trusses and the
 * fixtures' desk fields, so a desk design comes back as it was and not as a guessed MVR stage. An LED wall whose
 * driver is not a `screen` fixture of the file is dropped, because the rig needs that driver to light it and the
 * luma data reader could only check stand-ins; a `missing-screen-driver` warning tells the user. The stored MVR facts
 * take the restored types (`retype`).
 */
export function applyLumaData(design: StageDesign, luma: LumaStageData): LumaApplied {
  const links = new Map(luma.links.map((link) => [link.id, splitLink(link)]));
  const fixtures = design.fixtures.map((fixture) => relink(fixture, links));
  const drivers = new Set(fixtures.filter((fixture) => fixture.type === 'screen').map((fixture) => fixture.id));
  const screens = luma.screens.filter((screen) => drivers.has(screen.fixtureId));
  const warnings = luma.screens
    .filter((screen) => !drivers.has(screen.fixtureId))
    .map((screen): MvrWarning => ({
      code: 'missing-screen-driver',
      message: `LED wall ${screen.id} was dropped: its driver fixture ${screen.fixtureId} is not in the file.`,
      ref: screen.id,
    }));
  const { venue, scenery, deck, risers, trusses } = luma;
  const mvr = design.mvr && { mvr: retype(design.mvr, fixtures, links) };
  return { design: { ...design, venue, scenery, deck, screens, risers, trusses, fixtures, ...mvr }, warnings };
}
