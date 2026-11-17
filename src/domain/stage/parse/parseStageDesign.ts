import { STAGE_DESIGN_VERSION, type StageDesign } from '../StageDesign';
import { SOURCE_KINDS, VENUE_KINDS, type SceneryPart, type StageSource } from '../types';
import { parseDeck, parseRisers } from './parseDeck';
import { parseFixtures } from './parseFixture';
import { parseScreens } from './parseScreens';
import { parseTrusses } from './parseTruss';
import { allDefined, describeValue } from './rawValues';
import { Reader } from './readers';

/** The result of `parseStageDesign`: the checked design, or every problem found, each naming its path and value. */
export type StageParseResult =
  { readonly ok: true; readonly design: StageDesign } | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Checks a stored stage (the show's `stage` key) before the rig is built from it, so a hand-edited or corrupt show
 * falls back to the built-in stage instead of breaking the rig. It collects every error instead of throwing, keeps
 * only known keys (a later optional field such as MVR `patch` is therefore additive), normalizes rotations and fills
 * a missing scenery part with `true` (G3). An unknown version stops the read, as its fields may mean something else.
 */
export function parseStageDesign(raw: unknown): StageParseResult {
  const r = new Reader();
  const o = r.obj(raw, 'stage');
  if (o && o.v !== STAGE_DESIGN_VERSION) r.fail('v', `unknown stage version ${describeValue(o.v)}`);
  if (!o || r.errors.length > 0) return { ok: false, errors: r.errors };
  const { trusses, ids } = parseTrusses(r, o.trusses);
  const parsed = parseFixtures(r, o.fixtures, ids);
  const design = {
    source: parseSource(r, o.source),
    venue: parseVenue(r, o.venue),
    scenery: parseScenery(r, o.scenery),
    deck: parseDeck(r, o.deck),
    screens: parseScreens(r, o.screens, parsed),
    risers: parseRisers(r, o.risers),
  };
  if (!allDefined(design) || r.errors.length > 0) return { ok: false, errors: r.errors };
  return { ok: true, design: { v: STAGE_DESIGN_VERSION, ...design, trusses, fixtures: parsed.fixtures } };
}

function parseSource(r: Reader, raw: unknown): StageSource | undefined {
  const o = r.obj(raw, 'source');
  if (!o) return undefined;
  const source = {
    kind: r.oneOf(o.kind, 'source.kind', SOURCE_KINDS, 'source kind'),
    name: r.str(o.name, 'source.name'),
  };
  const fileHash = r.optional(o.fileHash, 'source.fileHash', r.str);
  if (!allDefined(source)) return undefined;
  return { ...source, ...(fileHash === undefined ? {} : { fileHash }) };
}

function parseVenue(r: Reader, raw: unknown): StageDesign['venue'] | undefined {
  const o = r.obj(raw, 'venue');
  if (!o) return undefined;
  const kind = r.oneOf(o.kind, 'venue.kind', VENUE_KINDS, 'venue');
  const gridY = r.optional(o.gridY, 'venue.gridY', r.num);
  if (kind === undefined) return undefined;
  return { kind, ...(gridY === undefined ? {} : { gridY }) };
}

/** A bad part is recorded as an error and read as `true`; the recorded error still rejects the design. */
function parseScenery(r: Reader, raw: unknown): StageDesign['scenery'] | undefined {
  const o = raw === undefined ? {} : r.obj(raw, 'scenery');
  if (!o) return undefined;
  const part = (key: SceneryPart): boolean => r.optional(o[key], `scenery.${key}`, r.bool) ?? true;
  return {
    deck: part('deck'),
    trusses: part('trusses'),
    band: part('band'),
    ledWall: part('ledWall'),
    crowd: part('crowd'),
  };
}
