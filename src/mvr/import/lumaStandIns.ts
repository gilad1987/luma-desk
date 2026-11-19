/** The value of an own field of a parsed JSON object; inherited keys never count, so `"constructor"` stays unread. */
const field = (raw: object, key: string): unknown => (Object.hasOwn(raw, key) ? Reflect.get(raw, key) : undefined);

/** The objects of a raw JSON list, or none when the value is not a list. */
function objects(value: unknown): object[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item: unknown): item is object => typeof item === 'object' && item !== null);
}

/**
 * The fields of a link that the stand-in takes over, so the parser checks each of them as it checks a stored show. An
 * unknown `product`, or one whose base is not the link's type, is dropped there and the fixture comes back plain.
 */
const LINK_FIELDS = ['type', 'role', 'trussId', 'mount', 'product', 'fixed', 'pixel'] as const;

/** The own link fields of the data; an absent optional field stays absent, so the parser never sees `undefined`. */
function linkFields(link: object): Record<string, unknown> {
  return Object.fromEntries(
    LINK_FIELDS.filter((key) => Object.hasOwn(link, key)).map((key) => [key, field(link, key)]),
  );
}

/** One stand-in: its link fields come from the data, so the parser checks them; a bare driver gets defaults. */
function standIn(id: unknown, link: object | undefined): Record<string, unknown> {
  const fields = link ? linkFields(link) : { type: 'screen', role: 'screen', trussId: null, mount: 'hang' };
  return { id, position: [0, 0, 0], ...fields };
}

/** The raw `footprint` of every link that has one, with the link's raw id, for the luma data reader to check. */
export function linkFootprints(raw: object): (readonly [unknown, unknown])[] {
  return objects(field(raw, 'links'))
    .filter((link) => Object.hasOwn(link, 'footprint'))
    .map((link) => [field(link, 'id'), field(link, 'footprint')] as const);
}

/**
 * Raw fixtures for checking the luma data with the stored-show parser: one per `links` entry (id, type, role, truss
 * id, mount, product, fixed, pixel) and one per LED wall driver id. The real fixtures travel as `<Fixture>` elements, but the parser checks a role, a truss
 * link and a wall driver only on fixtures, so these stand-ins let the one parser check the whole block. Nothing is
 * filtered here: a bad id, role or truss link fails the parse, and the import then treats the file as a plain MVR.
 */
export function lumaStandIns(raw: object): Record<string, unknown>[] {
  const drivers = new Set(objects(field(raw, 'screens')).map((screen) => field(screen, 'fixtureId')));
  const links = new Map(objects(field(raw, 'links')).map((link) => [field(link, 'id'), link]));
  return [...new Set([...links.keys(), ...drivers])].map((id) => standIn(id, links.get(id)));
}
