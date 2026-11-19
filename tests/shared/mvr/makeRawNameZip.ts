import { strToU8, zipSync, type Zippable } from 'fflate';

/** One file of `makeRawNameZip`: the name (a string is stored as its UTF-8 bytes, bytes as they are) and the content. */
export type RawNamedFile = readonly [
  name: Uint8Array | string,
  content: Uint8Array | string,
  /** Extra fields by header id, as fflate writes them into both ZIP headers. */
  extra?: Readonly<Record<number, Uint8Array>>,
];

/** Writes `to` over every place `from` stands in `bytes`; both have the same length. */
function overwrite(bytes: Uint8Array, from: Uint8Array, to: Uint8Array): void {
  for (let at = 0; at + from.length <= bytes.length; at += 1) {
    if (from.every((byte, index) => bytes[at + index] === byte)) bytes.set(to, at);
  }
}

/**
 * Builds a ZIP whose entry names are the given bytes and do NOT set the UTF-8 flag (general purpose bit 11), as some
 * writers store non-ASCII names. fflate always sets the flag for such a name, so the archive is built with ASCII
 * stand-in names of the same byte length, and the real name bytes are then written over them in both ZIP headers.
 * Names need at least four bytes, and the content must not hold a stand-in (`~0~~`).
 */
export function makeRawNameZip(files: readonly RawNamedFile[]): Uint8Array {
  const entries: Zippable = {};
  const swaps: (readonly [Uint8Array, Uint8Array])[] = [];
  files.forEach(([name, content, extra], index) => {
    const raw = typeof name === 'string' ? strToU8(name) : name;
    const standIn = `~${index}`.padEnd(raw.length, '~');
    const bytes = typeof content === 'string' ? strToU8(content) : content;
    entries[standIn] = extra ? [bytes, { extra: { ...extra } }] : bytes;
    swaps.push([strToU8(standIn), raw]);
  });
  const zip = zipSync(entries);
  for (const [from, to] of swaps) overwrite(zip, from, to);
  return zip;
}
