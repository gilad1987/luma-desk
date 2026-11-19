import { cp437 } from './cp437';
import { unicodePath } from './unicodePath';

const END_RECORD = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const DIRECTORY_ENTRY = 0x02014b50;
/** General purpose bit 11: the entry name is UTF-8. */
const UTF8_FLAG = 2048;

/** Where the central directory starts and how many entries it has; `undefined` without a ZIP end record. */
function directory(view: DataView): { readonly offset: number; readonly count: number } | undefined {
  const last = view.byteLength - 22;
  // the end record sits before an archive comment of at most 65535 bytes, so the search runs back that far
  for (let at = last; at >= Math.max(0, last - 0xffff); at -= 1) {
    if (view.getUint32(at, true) !== END_RECORD) continue;
    const count = view.getUint16(at + 10, true);
    const offset = view.getUint32(at + 16, true);
    if (count !== 0xffff && offset !== 0xffffffff) return { offset, count };
    if (at < 20 || view.getUint32(at - 20, true) !== ZIP64_LOCATOR) return undefined;
    const end64 = Number(view.getBigUint64(at - 12, true));
    const count64 = Number(view.getBigUint64(end64 + 32, true));
    return { offset: Number(view.getBigUint64(end64 + 48, true)), count: count64 };
  }
  return undefined;
}

/**
 * The entries that do not set the UTF-8 flag, by the name fflate returns for them: one character per raw name byte
 * (fflate reads such a name as Latin-1 and does not report the flag). The value is the entry's Unicode Path name
 * (`unicodePath`) when it has one. The archive needs both to decode those names itself. A file whose directory cannot be read gives the names found so far: fflate then rejects the file anyway.
 */
export function legacyNames(zip: Uint8Array): ReadonlyMap<string, string | undefined> {
  const names = new Map<string, string | undefined>();
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  try {
    const found = directory(view);
    let at = found?.offset ?? 0;
    for (let entry = 0; found && entry < found.count; entry += 1) {
      if (view.getUint32(at, true) !== DIRECTORY_ENTRY) break;
      const length = view.getUint16(at + 28, true);
      const utf8 = Math.floor(view.getUint16(at + 8, true) / UTF8_FLAG) % 2 === 1;
      const extraEnd = at + 46 + length + view.getUint16(at + 30, true);
      const raw = zip.subarray(at + 46, at + 46 + length);
      if (!utf8) names.set(String.fromCharCode(...raw), unicodePath(zip.subarray(at + 46 + length, extraEnd), raw));
      at = extraEnd + view.getUint16(at + 32, true);
    }
  } catch {
    // a DataView read past the end: the directory is cut short, and `unzipSync` reports the broken file
  }
  return names;
}

/** An entry name, and the other reading of its bytes when the ZIP does not say which encoding it used. */
export interface DecodedName {
  readonly name: string;
  readonly alt?: string;
}

/**
 * Decodes a name without the UTF-8 flag from fflate's one-character-per-byte text. Many writers store UTF-8 and do
 * not set the flag, so valid UTF-8 is read as UTF-8 and code page 437 (what the ZIP format says) is the other
 * reading. Bytes that are not UTF-8 are code page 437, and Windows-1252, which Western Windows tools write, is the
 * other reading: it is Latin-1 except 0x80-0x9F, where it has the en dash, the trademark sign and curly quotes.
 */
export function decodeLegacy(binary: string): DecodedName {
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.every((byte) => byte < 0x80)) return { name: binary };
  try {
    return { name: new TextDecoder('utf-8', { fatal: true }).decode(bytes), alt: cp437(bytes) };
  } catch {
    return { name: cp437(bytes), alt: new TextDecoder('windows-1252').decode(bytes) };
  }
}

/**
 * A function that gives the real name of an entry of `zip` from the name fflate returns for it: the Unicode Path
 * name when the entry has one (the code-page reading is then the other reading), else `decodeLegacy`, and the name
 * as it is for an entry that sets the UTF-8 flag. The MVR archive and the GDTF archives inside it share it.
 */
export function nameDecoder(zip: Uint8Array): (name: string) => DecodedName {
  const legacy = legacyNames(zip);
  return (name) => {
    if (!legacy.has(name)) return { name };
    const unicode = legacy.get(name);
    return unicode === undefined ? decodeLegacy(name) : { name: unicode, alt: decodeLegacy(name).name };
  };
}
