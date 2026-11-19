import { uuidKey } from '../../scene/auxNames';
import { attr, childElement, childElements, childRawText, descendantElements } from '../../xml/elements';

/** What the export kept, removed or left open around a re-type or a delete; each kind is one line of the summary. */
export interface IntegrityCounts {
  /** Re-typed fixtures that keep children naming geometry, channels or wheels of their earlier GDTF (B3). */
  readonly retyped: number;
  /** The kinds of those children, in the order of the Fixture children table. */
  readonly retypedKinds: readonly string[];
  /** The `<GDTFSpec>` texts this export wrote for re-typed fixtures. */
  readonly retypedSpecs: readonly string[];
  /** `<Connection>` elements removed because their `toObject` was a fixture the desk deleted (B4). */
  readonly connections: number;
  /** Elements whose `multipatch` names a fixture the desk deleted; they are kept as they are (B4). */
  readonly orphans: number;
  /** Objects moved out of a deleted fixture whose `<ChildPosition>` was removed (B4). */
  readonly childPositions: number;
}

/**
 * The Fixture children that refer into the fixture's GDTF: a geometry (`ChildPosition`, `Protocols`, `Alignments`,
 * `Connections`), a channel function (`CustomCommands`), a wheel slot (`Overwrites`, `Gobo`) or its mapping. After a
 * re-type they still name the earlier GDTF. They are user data, so the export keeps them and says so.
 */
const GDTF_BOUND = [
  'ChildPosition',
  'Protocols',
  'Alignments',
  'CustomCommands',
  'Overwrites',
  'Connections',
  'Mappings',
  'Gobo',
];

/** Whether an element holds anything: a child element or text. */
const holds = (el: Element | undefined): boolean =>
  el !== undefined && (el.textContent ?? '').trim() + el.children.length !== '0';

/** Collects, while the fixtures are patched, what the summary must say about re-typed and deleted fixtures. */
export class Integrity {
  private readonly kinds = new Set<string>();
  private readonly specs = new Set<string>();
  private readonly gone: string[] = [];
  private retyped = 0;
  private childPositions = 0;

  /** Notes a fixture this export gave another GDTF. */
  retypedFixture(element: Element): void {
    const kept = GDTF_BOUND.filter((tag) => holds(childElement(element, tag)));
    for (const tag of kept) this.kinds.add(tag);
    this.retyped += kept.length > 0 ? 1 : 0;
    this.specs.add(childRawText(element, 'GDTFSpec') ?? '');
  }

  /** Notes a removed fixture and how many hoisted children lost their `<ChildPosition>`. */
  deletedFixture(uuid: string | undefined, childPositions: number): void {
    if (uuid) this.gone.push(uuid);
    this.childPositions += childPositions;
  }

  /**
   * Removes every `<Connection>` to a deleted fixture and counts the `multipatch` children of one. A `Connection`
   * with a `toObject` that is no object is a cable to nothing, so it goes. `multipatch` is "The unique identifier of
   * the parent multipatch fixture"; the spec does not say the parent must be in the file, and the attribute is the
   * only trace that the fixtures shared one id, so it stays and the summary names the fixtures. A uuid that another
   * element still carries (a file that repeats uuids) is not gone. References are matched as the import matches
   * them (`uuidKey`): writers differ in letter case and spacing, and only the hex digits tell two uuids apart.
   */
  finish(doc: Document): IntegrityCounts {
    const all = Array.from(doc.getElementsByTagName('*'));
    const keyOf = (el: Element, name: string): string => uuidKey(attr(el, name) ?? '');
    const left = new Set(all.map((el) => keyOf(el, 'uuid')));
    const gone = new Set(this.gone.map(uuidKey).filter((key) => !left.has(key)));
    const cut = descendantElements(doc.documentElement, 'Connection').filter((el) => gone.has(keyOf(el, 'toObject')));
    for (const connection of cut) connection.remove();
    const orphans = all.filter((el) => gone.has(keyOf(el, 'multipatch'))).length;
    const retypedKinds = GDTF_BOUND.filter((tag) => this.kinds.has(tag));
    const retypedSpecs = [...this.specs];
    const { retyped, childPositions } = this;
    return { retyped, retypedKinds, retypedSpecs, connections: cut.length, orphans, childPositions };
  }
}

/** Takes the `<ChildPosition>` off each element and gives the number taken. */
export function dropChildPositions(elements: readonly Element[]): number {
  const found = elements.flatMap((el) => childElements(el, 'ChildPosition'));
  for (const position of found) position.remove();
  return found.length;
}
