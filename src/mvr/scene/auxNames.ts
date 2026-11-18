import { attr, childElement, childElements } from '../xml/elements';

/**
 * The names of the `<Position>` and `<Class>` nodes of `<AUXData>`, by `uuidKey`. Spec (MVR 1.6): Position "defines a
 * logical grouping of lighting devices and trusses"; Class "defines a logical grouping across different layers.
 * Primarily used for controlling object visibility of objects across multiple Layers." Both have a `uuid` and a `name`.
 */
export interface AuxNames {
  readonly positions: ReadonlyMap<string, string>;
  readonly classes: ReadonlyMap<string, string>;
}

/**
 * A uuid as a lookup key. The spec formats a UUID as `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`, but its own Fixture
 * example writes references as spaced byte pairs (`77 BC DE 16 ...`) and writers differ in letter case, so only the
 * hex digits tell two uuids apart.
 */
export function uuidKey(uuid: string): string {
  return uuid.replace(/[^0-9a-f]/gi, '').toLowerCase();
}

function namesOf(aux: Element | undefined, tag: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const el of aux ? childElements(aux, tag) : []) {
    const key = uuidKey(attr(el, 'uuid') ?? '');
    // the first node of a uuid wins, as a reader that stops at the first match would see it
    if (key !== '' && !names.has(key)) names.set(key, attr(el, 'name') ?? '');
  }
  return names;
}

/** Reads the position and class names of the scene's `<AUXData>`; both maps are empty when the file has none. */
export function readAuxNames(aux: Element | undefined): AuxNames {
  return { positions: namesOf(aux, 'Position'), classes: namesOf(aux, 'Class') };
}

/** The names per document, read once: every object of a scene asks for the name of its class. */
const byDocument = new WeakMap<Document, AuxNames>();

/** The aux names of the scene an element is in. */
export function auxNamesOf(el: Element): AuxNames {
  const doc = el.ownerDocument;
  const known = byDocument.get(doc);
  if (known) return known;
  const scene = childElement(doc.documentElement, 'Scene');
  const names = readAuxNames(scene && childElement(scene, 'AUXData'));
  byDocument.set(doc, names);
  return names;
}
