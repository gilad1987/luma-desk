import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import type { FixtureLink, LinkFootprint, LumaStageData } from '../luma/lumaData';
import type { MvrWarning } from '../MvrWarning';
import { linkFootprint } from './linkFootprint';

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
 * `product`, `fixed` and `pixel` replace the fixture's own, so a fixture without them in the data has none after the
 * import; a product comes back before `placeBodies`, which then shifts the body by the product's own mount height.
 */
function relink(fixture: StageFixture, links: ReadonlyMap<number, SplitLink>): StageFixture {
  const link = links.get(fixture.id);
  if (!link) return fixture;
  const { position, rotation, patch } = fixture;
  return { ...link.desk, position, ...(rotation ? { rotation } : {}), ...(patch ? { patch } : {}) };
}

/**
 * The MVR facts with each fixture's `type` set to the type it has now. The import guessed a type without a GDTF
 * file, and the luma data then restored the desk type; the export reads a type mismatch as "the user re-typed the
 * fixture" and drops the file's GDTF name and mode, so the stored type must be the restored one. A footprint read
 * from a GDTF file in this archive wins (spread last); else the link's footprint and body size come back
 * (`linkFootprint`), as a desk export holds no GDTF file. A body size from such a GDTF is added later and wins too
 * (`placeBodies`).
 */
function retype(
  mvr: MvrDesignInfo,
  fixtures: readonly StageFixture[],
  links: ReadonlyMap<number, SplitLink>,
): MvrDesignInfo {
  const entries = fixtures.flatMap((fixture) => {
    const info = mvr.fixtures[String(fixture.id)];
    const kept = info && { ...linkFootprint(info, links.get(fixture.id)?.footprint), ...info, type: fixture.type };
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
 * take the restored types (`retype`), and the stored hidden layers, when the data has them, replace the hall rule's.
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
  const hidden = luma.hiddenLayers && { hiddenLayers: luma.hiddenLayers };
  const mvr = design.mvr && { mvr: { ...retype(design.mvr, fixtures, links), ...hidden } };
  return { design: { ...design, venue, scenery, deck, screens, risers, trusses, fixtures, ...mvr }, warnings };
}
