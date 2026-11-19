import { childElement, childElements } from '../../xml/elements';

/**
 * The child order of `<Fixture>` in the MVR 1.6 node definition. A child the export must add goes before the first
 * child that the spec puts after it, so a reader that expects the spec order still finds it; unknown children never
 * move.
 */
const FIXTURE_ORDER = [
  'Matrix',
  'Classing',
  'GDTFSpec',
  'GDTFMode',
  'Focus',
  'CastShadow',
  'DMXInvertPan',
  'DMXInvertTilt',
  'Position',
  'Function',
  'FixtureID',
  'FixtureIDNumeric',
  'UnitNumber',
  'ChildPosition',
  'Addresses',
  'Protocols',
  'Alignments',
  'CustomCommands',
  'Overwrites',
  'Connections',
  'Color',
  'CustomIdType',
  'CustomId',
  'Mappings',
  'Gobo',
  'ChildList',
];

/** Inserts `child` into the fixture at its place in the spec order and gives it back. */
export function insertChild(fixture: Element, child: Element): Element {
  const rank = FIXTURE_ORDER.indexOf(child.localName);
  const next = childElements(fixture).find((el) => FIXTURE_ORDER.indexOf(el.localName) > rank);
  fixture.insertBefore(child, next ?? null);
  return child;
}

/**
 * Sets the text of the fixture's `tag` child, adding the child when the file had none. True when the text changed;
 * equal text is not written again, so the element keeps its exact original form.
 */
export function setChildText(fixture: Element, tag: string, text: string): boolean {
  const el = childElement(fixture, tag);
  if (el?.textContent === text) return false;
  (el ?? insertChild(fixture, fixture.ownerDocument.createElement(tag))).textContent = text;
  return true;
}
