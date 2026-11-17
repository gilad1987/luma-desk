import { STAGE_DESIGN_VERSION, type StageDeck, type StageDesign, type StageRiser } from '../StageDesign';
import type { SceneryPart, StageSource, VenueKind } from '../types';
import { parseFixtures } from './parseFixture';
import { parseScreens } from './parseScreens';
import { parseTrusses } from './parseTruss';
import { allDefined, describeValue, Reader } from './readers';

const SOURCE_KINDS: readonly StageSource['kind'][] = ['template', 'builder', 'mvr'];
const VENUE_KINDS: readonly VenueKind[] = ['sultans-pool', 'black-box', 'open-field'];

/** The result of `parseStageDesign`: the checked design, or every problem found, each naming its path and value. */
export type StageParseResult =
  { readonly ok: true; readonly design: StageDesign } | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Checks a stored stage (the show's `stage` key) before the rig is built from it, so a hand-edited or corrupt show
 * falls back to the built-in stage instead of breaking the rig. It collects every error instead of throwing, keeps
 * only known keys (a later optional field such as MVR `patch` is therefore additive), normalizes rotations and fills
 * a missing scenery part with `true` (G3).
 */
export function parseStageDesign(raw: unknown): StageParseResult {
  const r = new Reader();
  const o = r.obj(raw, 'stage');
  if (!o) return { ok: false, errors: r.errors };
  if (o.v !== STAGE_DESIGN_VERSION) return { ok: false, errors: [`v: unknown stage version ${describeValue(o.v)}`] };
  const { trusses, ids } = parseTrusses(r, o.trusses);
  const fixtures = parseFixtures(r, o.fixtures, ids);
  const design = {
    source: parseSource(r, o.source),
    venue: parseVenue(r, o.venue),
    scenery: parseScenery(r, o.scenery),
    deck: parseDeck(r, o.deck),
    screens: parseScreens(r, o.screens, fixtures),
    risers: r.list(o.risers, 'risers', (v, path) => parseRiser(r, v, path)),
  };
  if (!allDefined(design) || r.errors.length > 0) return { ok: false, errors: r.errors };
  return { ok: true, design: { v: STAGE_DESIGN_VERSION, ...design, trusses, fixtures } };
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

function parseScenery(r: Reader, raw: unknown): StageDesign['scenery'] | undefined {
  const o = raw === undefined ? {} : r.obj(raw, 'scenery');
  if (!o) return undefined;
  const part = (key: SceneryPart): boolean | undefined => r.optional(o[key], `scenery.${key}`, r.bool) ?? true;
  const scenery = {
    deck: part('deck'),
    trusses: part('trusses'),
    band: part('band'),
    ledWall: part('ledWall'),
    crowd: part('crowd'),
  };
  return allDefined(scenery) ? scenery : undefined;
}

function parseDeck(r: Reader, raw: unknown): StageDeck | undefined {
  const o = r.obj(raw, 'deck');
  if (!o) return undefined;
  const deck = {
    x0: r.num(o.x0, 'deck.x0'),
    x1: r.num(o.x1, 'deck.x1'),
    z0: r.num(o.z0, 'deck.z0'),
    z1: r.num(o.z1, 'deck.z1'),
    height: r.num(o.height, 'deck.height'),
  };
  if (!allDefined(deck)) return undefined;
  if (deck.x0 >= deck.x1) r.fail('deck.x1', `must be greater than x0 ${deck.x0}, got ${deck.x1}`);
  if (deck.z0 >= deck.z1) r.fail('deck.z1', `must be greater than z0 ${deck.z0}, got ${deck.z1}`);
  if (deck.height < 0) r.fail('deck.height', `must be 0 or more, got ${deck.height}`);
  return deck;
}

function parseRiser(r: Reader, raw: unknown, path: string): StageRiser | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const riser = { id: r.str(o.id, `${path}.id`), at: r.vec3(o.at, `${path}.at`), size: r.vec3(o.size, `${path}.size`) };
  return allDefined(riser) ? riser : undefined;
}
