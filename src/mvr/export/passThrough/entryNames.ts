import type { DecodedName } from '../../archive/legacyNames';

const ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** Whether the scene text holds `reading`, as written or with the XML escapes a writer puts in an attribute value. */
function named(sceneText: string, reading: string): boolean {
  return sceneText.includes(reading) || sceneText.includes(reading.replace(/[&<>"]/g, (char) => ESCAPES[char] ?? char));
}

/**
 * The name an entry is exported under, from the name fflate returns for it. fflate reads a name without the UTF-8
 * flag one character per byte, and `zipSync` writes every key as UTF-8 with the flag, so the raw key would come back
 * as another name and the scene would lose the file. The import decodes such a name (`nameDecoder`) and finds the file
 * by either reading, so the export writes the reading the scene names, else the first one, as the import reads it.
 */
export function entryNameResolver(decode: (name: string) => DecodedName, sceneText: string): (raw: string) => string {
  return (raw) => {
    const { name, alt } = decode(raw);
    return alt !== undefined && !named(sceneText, name) && named(sceneText, alt) ? alt : name;
  };
}

/** Every name of `names` that an earlier one already had, once per repeat, in order. */
export function repeatedNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const repeat = seen.has(name);
    seen.add(name);
    return repeat;
  });
}
