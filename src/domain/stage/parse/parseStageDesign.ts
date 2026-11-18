import type { MvrDesignInfo } from '../mvr';
import { STAGE_DESIGN_VERSION, type StageDesign } from '../StageDesign';
import { SOURCE_KINDS, VENUE_KINDS, type SceneryPart, type StageSource } from '../types';
import { parseDeck, parseRisers } from './parseDeck';
import { parseFixtures } from './parseFixture';
import { parseMvrInfo } from './parseMvrInfo';
import { parseScreens } from './parseScreens';
import { parseTrusses } from './parseTruss';
import { allDefined, type Raw } from './rawValues';
import { Reader } from './readers';
import { storedMvrVenue } from './storedMvrVenue';

/** The result of `parseStageDesign`: the checked design, or every problem found, each naming its path and value. */
export type StageParseResult =
  { readonly ok: true; readonly design: StageDesign } | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Checks a stored stage (the show's `stage` key) before the rig is built from it, so a hand-edited or corrupt show
 * falls back to the built-in stage instead of breaking the rig. It collects every error instead of throwing, keeps
 * only known keys, so a new optional field is additive, normalizes rotations and fills a missing scenery part with
 * `true` (G3). An unknown version stops the read, as its fields may mean something else.
 */
export function parseStageDesign(raw: unknown): StageParseResult {
  const r = new Reader();
  // The design is read as the `stage` field of the show, so a design that is not an object is reported as `stage`.
  const o = r.obj({ stage: raw }, 'stage', '');
  if (o) r.oneOf(o, 'v', '', { options: [STAGE_DESIGN_VERSION], what: 'stage version' });
  if (!o || r.errors.length > 0) return { ok: false, errors: r.errors };
  const { trusses, ids } = parseTrusses(r, o);
  const parsed = parseFixtures(r, o, ids);
  const design = {
    source: parseSource(r, o),
    venue: parseVenue(r, o),
    scenery: parseScenery(r, o),
    deck: parseDeck(r, o),
    screens: parseScreens(r, o, parsed),
    risers: parseRisers(r, o),
  };
  const mvr = r.optional(o, 'mvr', '', (c, k, p) => parseMvrInfo(r, c, k, p));
  if (mvr) checkMvrFixtureIds(r, mvr, parsed.ids);
  if (!allDefined(design) || r.errors.length > 0) return { ok: false, errors: r.errors };
  const mvrField = mvr === undefined ? {} : { mvr };
  const venue = storedMvrVenue(design);
  return {
    ok: true,
    design: { v: STAGE_DESIGN_VERSION, ...design, venue, trusses, fixtures: parsed.fixtures, ...mvrField },
  };
}

/**
 * Each `mvr.fixtures` key must be the id of a fixture in the design, as a fixture's `trussId` must name a truss. Ids
 * are given out again after a delete, so an entry without its fixture would hand its MVR uuid and GDTF name to a
 * later fixture. `ids` holds fixtures that failed on another field too, so they get no second error.
 */
function checkMvrFixtureIds(r: Reader, mvr: MvrDesignInfo, ids: ReadonlySet<number>): void {
  const at = r.path(r.path('', 'mvr'), 'fixtures');
  for (const key of Object.keys(mvr.fixtures)) {
    if (!ids.has(Number(key))) r.fail(r.path(at, key), `no fixture has id ${key}`);
  }
}

function parseSource(r: Reader, stage: Raw): StageSource | undefined {
  const at = 'source';
  const o = r.obj(stage, at, '');
  if (!o) return undefined;
  const source = {
    kind: r.oneOf(o, 'kind', at, { options: SOURCE_KINDS, what: 'source kind' }),
    name: r.str(o, 'name', at),
  };
  const fileHash = r.optional(o, 'fileHash', at, r.str);
  if (!allDefined(source)) return undefined;
  return { ...source, ...(fileHash === undefined ? {} : { fileHash }) };
}

function parseVenue(r: Reader, stage: Raw): StageDesign['venue'] | undefined {
  const at = 'venue';
  const o = r.obj(stage, at, '');
  if (!o) return undefined;
  const kind = r.oneOf(o, 'kind', at, { options: VENUE_KINDS, what: 'venue' });
  const gridY = r.optional(o, 'gridY', at, r.num);
  if (kind === undefined) return undefined;
  return { kind, ...(gridY === undefined ? {} : { gridY }) };
}

/**
 * A missing `scenery` or part reads as `true`. A bad part is recorded as an error and read as `true`; the recorded
 * error still rejects the design.
 */
function parseScenery(r: Reader, stage: Raw): StageDesign['scenery'] {
  const at = 'scenery';
  const o = r.optional(stage, at, '', r.obj) ?? {};
  const part = (key: SceneryPart): boolean => r.optional(o, key, at, r.bool) ?? true;
  return {
    deck: part('deck'),
    trusses: part('trusses'),
    band: part('band'),
    ledWall: part('ledWall'),
    crowd: part('crowd'),
  };
}
