import { parseStageDesign } from '../../domain/stage/parse/parseStageDesign';
import { parseFootprint } from '../../domain/stage/parse/parseFootprint';
import type { Key } from '../../domain/stage/parse/fieldReader';
import { allDefined, type Raw } from '../../domain/stage/parse/rawValues';
import { Reader } from '../../domain/stage/parse/readers';
import { STAGE_DESIGN_VERSION } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { LUMA_DATA_VERSION, LUMA_PROVIDER, linkOf } from '../luma/lumaData';
import type { FixtureLink, LinkFootprint, LumaStageData } from '../luma/lumaData';
import { attr, childElement, childElements } from '../xml/elements';
import { linkFootprints, lumaStandIns } from './lumaStandIns';

/** The text of the desk's `<Data>` block in the current version, or `undefined` when the file has none. */
function lumaDataText(doc: Document): string | undefined {
  const userData = childElement(doc.documentElement, 'UserData');
  const blocks = userData ? childElements(userData, 'Data') : [];
  const data = blocks.find((block) => attr(block, 'provider') === LUMA_PROVIDER);
  return data && attr(data, 'ver') === LUMA_DATA_VERSION ? (data.textContent ?? '') : undefined;
}

/** `JSON.parse` that gives `undefined` for bad JSON instead of throwing. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** The offset of the data: zero when absent, `undefined` when it is not three finite numbers. */
function readOffset(raw: object): Vec3 | undefined {
  const value: unknown = 'offset' in raw ? raw.offset : undefined;
  return value === undefined ? [0, 0, 0] : new Reader().vec3({ offset: value }, 'offset', '');
}

/** The hidden layers to spread into the data: none when absent, `undefined` when they are not a list of uuids. */
function readHiddenLayers(raw: object): { readonly hiddenLayers?: readonly string[] } | undefined {
  const value: unknown = 'hiddenLayers' in raw ? raw.hiddenLayers : undefined;
  if (value === undefined) return {};
  const r = new Reader();
  const hiddenLayers = r.list({ hiddenLayers: value }, 'hiddenLayers', '', r.str);
  return hiddenLayers === undefined || r.errors.length > 0 ? undefined : { hiddenLayers };
}

/**
 * One link's footprint: channels checked like a stored show's (`parseFootprint`), size > 0, spec and mode text. Both
 * numbers are optional: a mode with no DMX footprint has no channels, and an older export has no size.
 */
function readFootprint(r: Reader, parent: Raw, key: Key, at: string): LinkFootprint | undefined {
  const o = r.obj(parent, key, at);
  if (o === undefined) return undefined;
  const path = r.path(at, key);
  const footprint = { gdtfSpec: r.str(o, 'gdtfSpec', path), gdtfMode: r.str(o, 'gdtfMode', path) };
  const channels = r.optional(o, 'channels', path, (raw, field, at) => parseFootprint(r, raw, field, at));
  const bodySize = r.optional(o, 'bodySize', path, r.positive);
  const counted = channels === undefined ? {} : { channels };
  const sized = bodySize === undefined ? {} : { bodySize };
  return allDefined(footprint) ? { ...footprint, ...counted, ...sized } : undefined;
}

/**
 * The links' footprints by fixture id; `undefined` when one is bad, so the whole data is rejected as any other
 * invalid field is. The stored-show parser drops unknown fixture keys, so it cannot check this MVR field for us.
 */
function readFootprints(raw: object): ReadonlyMap<unknown, LinkFootprint> | undefined {
  const r = new Reader();
  const entries = linkFootprints(raw).map(
    ([id, footprint]) => [id, readFootprint(r, { footprint }, 'footprint', `links.${String(id)}`)] as const,
  );
  if (r.errors.length > 0) return undefined;
  return new Map(entries.flatMap(([id, footprint]) => (footprint === undefined ? [] : [[id, footprint] as const])));
}

/**
 * Reads the stage parts back from a parsed scene, checked by the same parser as a stored show, so bad or hand-edited
 * data cannot reach the rig. The fixtures come from `<Fixture>` elements, so stand-ins carry the links and satisfy
 * the parser's "a wall needs its driver" check here; the import checks the real drivers. Missing, other-version or
 * invalid data gives `undefined`, and the import then treats the file as a plain MVR.
 */
export function readLumaData(doc: Document): LumaStageData | undefined {
  const text = lumaDataText(doc);
  const raw = text === undefined ? undefined : parseJson(text);
  if (typeof raw !== 'object' || raw === null) return undefined;
  const offset = readOffset(raw);
  const source = { kind: 'mvr', name: '' };
  const parsed = parseStageDesign({ ...raw, v: STAGE_DESIGN_VERSION, source, fixtures: lumaStandIns(raw) });
  const footprints = readFootprints(raw);
  const hidden = readHiddenLayers(raw);
  if (!parsed.ok || offset === undefined || footprints === undefined || hidden === undefined) return undefined;
  const { venue, scenery, deck, screens, risers, trusses, fixtures } = parsed.design;
  const links = fixtures.map((fixture): FixtureLink => {
    const footprint = footprints.get(fixture.id);
    return footprint === undefined ? linkOf(fixture) : { ...linkOf(fixture), footprint };
  });
  return { venue, scenery, deck, screens, risers, trusses, offset, links, ...hidden };
}
