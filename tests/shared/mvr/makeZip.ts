import { strToU8, zipSync, type Zippable } from 'fflate';

/**
 * Builds a ZIP archive in memory from inline files; strings are stored as UTF-8. Tests make their MVR and GDTF
 * samples this way, so the repo holds no binary sample files with an unclear licence.
 */
export function makeZip(files: Readonly<Record<string, Uint8Array | string>>): Uint8Array {
  const entries: Zippable = {};
  for (const [name, content] of Object.entries(files)) {
    entries[name] = typeof content === 'string' ? strToU8(content) : content;
  }
  return zipSync(entries);
}
