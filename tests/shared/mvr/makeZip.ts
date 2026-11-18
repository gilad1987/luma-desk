import { strToU8, zipSync, type Zippable } from 'fflate';

/**
 * The time every entry carries. Without it fflate stamps the current time in 2-second steps, so the same files
 * zipped across a step boundary give other bytes and another hash: a slow full-suite run then saw two files.
 */
const ZIP_TIME = new Date(2020, 0, 1);

/**
 * Builds a ZIP archive in memory from inline files; strings are stored as UTF-8. Tests make their MVR and GDTF
 * samples this way, so the repo holds no binary sample files with an unclear licence.
 */
export function makeZip(files: Readonly<Record<string, Uint8Array | string>>): Uint8Array {
  const entries: Zippable = {};
  for (const [name, content] of Object.entries(files)) {
    entries[name] = typeof content === 'string' ? strToU8(content) : content;
  }
  return zipSync(entries, { mtime: ZIP_TIME });
}
