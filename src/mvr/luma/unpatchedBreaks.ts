import { attr, childElement, childElements } from '../xml/elements';
import { LUMA_DATA_VERSION, LUMA_PROVIDER } from './lumaData';

/** `JSON.parse` that gives `undefined` for bad JSON instead of throwing. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * The `unpatchedBreaks` of the desk's `<Data>` block: by fixture key (`uuid#occurrence` among the `<Fixture>` elements
 * of the file it is written in), the break the desk models of a fixture it wrote without a patch while other breaks
 * kept their addresses. MVR has no "no address" value, so the desk's break has no `<Address>` in such a file, and a
 * reader takes the next break for the patch. With this record the desk knows on the way back that the fixture is
 * unpatched and that the breaks in the file are not its own. The key is the element's place in the file and not the
 * desk id: the desk assigns the ids of fixtures without a usable FixtureID in file order, so deleting one fixture
 * renumbers the rest on the next import. It is file data, so it rides beside the links and never reaches a fixture.
 * An export made before the record has none, and a value that is not a break number counts as none.
 */
export function unpatchedBreaksOf(doc: Document): ReadonlyMap<string, number> {
  const found = new Map<string, number>();
  const userData = childElement(doc.documentElement, 'UserData');
  const blocks = userData ? childElements(userData, 'Data') : [];
  const data = blocks.find((block) => attr(block, 'provider') === LUMA_PROVIDER);
  if (!data || attr(data, 'ver') !== LUMA_DATA_VERSION) return found;
  const raw = parseJson(data.textContent ?? '');
  const record: unknown =
    typeof raw === 'object' && raw !== null && 'unpatchedBreaks' in raw ? raw.unpatchedBreaks : undefined;
  if (typeof record !== 'object' || record === null) return found;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) found.set(key, value);
  }
  return found;
}
