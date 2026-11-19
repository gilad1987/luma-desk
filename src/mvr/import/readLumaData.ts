import { parseStageDesign } from '../../domain/stage/parse/parseStageDesign';
import { Reader } from '../../domain/stage/parse/readers';
import { STAGE_DESIGN_VERSION } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { LUMA_DATA_VERSION, LUMA_PROVIDER } from '../luma/lumaData';
import type { LumaStageData } from '../luma/lumaData';
import { attr, childElement, childElements } from '../xml/elements';
import { lumaStandIns } from './lumaStandIns';
import { readOriginalProvider } from './originalProvider';
import { readLinks } from './readLinks';

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
  const links = parsed.ok ? readLinks(raw, parsed.design.fixtures) : undefined;
  const hidden = readHiddenLayers(raw);
  if (!parsed.ok || offset === undefined || links === undefined || hidden === undefined) return undefined;
  const { venue, scenery, deck, screens, risers, trusses } = parsed.design;
  return { venue, scenery, deck, screens, risers, trusses, offset, links, ...hidden, ...readOriginalProvider(raw) };
}
