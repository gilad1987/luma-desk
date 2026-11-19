import type { DecodedName } from './legacyNames';

/** One root-level file of an archive under its decoded name. */
export interface ArchiveEntry extends DecodedName {
  readonly bytes: Uint8Array;
}

const nfc = (text: string): string => text.normalize('NFC');
/** The loosest form two names are compared in: composed characters, no case. */
const loose = (text: string): string => nfc(text).toLowerCase();

/** The entries by one key each; an entry without the key (no other reading) is left out. */
function groupBy(
  entries: readonly ArchiveEntry[],
  keyOf: (entry: ArchiveEntry) => string | undefined,
): ReadonlyMap<string, readonly ArchiveEntry[]> {
  const groups = new Map<string, ArchiveEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (key === undefined) continue;
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return groups;
}

/**
 * Finds an archive file by the name a scene or a GDTF gives it. Writers do not agree with themselves: the XML names
 * `Bühne.glb` while the ZIP stores the name decomposed (macOS), in another case, or in bytes the ZIP flags do not
 * explain. The rules run from strict to loose (the exact name, the Unicode-composed name, no case, then the other
 * reading of the name bytes), and the first rule that matches anything decides, so a loose rule never beats an
 * exact file. The maps are built once, because a large show looks up thousands of mesh files.
 */
export class NameIndex {
  private readonly rules: readonly (readonly [
    (name: string) => string,
    ReadonlyMap<string, readonly ArchiveEntry[]>,
  ])[];

  constructor(entries: readonly ArchiveEntry[]) {
    this.rules = [
      [(name) => name, groupBy(entries, (entry) => entry.name)],
      [nfc, groupBy(entries, (entry) => nfc(entry.name))],
      [loose, groupBy(entries, (entry) => loose(entry.name))],
      [loose, groupBy(entries, (entry) => (entry.alt === undefined ? undefined : loose(entry.alt)))],
    ];
  }

  /**
   * The entries the strictest matching rule gives for `name`: none, the one file, or several. Several means the
   * name is ambiguous; the caller must use none of them, because a guess could draw the wrong mesh without a word.
   */
  matches(name: string): readonly ArchiveEntry[] {
    return this.named(name) ?? this.named(`${name}.3ds`) ?? [];
  }

  /**
   * What the rules give for one name. `matches` asks again with `.3ds` for a name that no rule found: the MVR 1.6
   * `Geometry3D` `fileName` says "If there is no extension, it will assume that the extension is 3ds", so
   * `fileName="geo1"` names the entry `geo1.3ds` (in any case, as the loose rules read it). A dot does not tell that
   * a name has an extension (`truss v1.2` names `truss v1.2.3ds`), so every name that is not found is asked again.
   * The name as written goes first, so an entry stored under it still wins.
   */
  private named(name: string): readonly ArchiveEntry[] | undefined {
    for (const [keyOf, groups] of this.rules) {
      const found = groups.get(keyOf(name));
      if (found) return found;
    }
    return undefined;
  }
}
