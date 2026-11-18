/** Four FNV-1a start values; each gives 32 bits of the 128-bit uuid. */
const SEEDS = [0x811c9dc5, 0x050c5d1f, 0x9e3779b9, 0x85ebca6b] as const;
const FNV_PRIME = 0x01000193;

/** The 32-bit FNV-1a hash of `text`, started at `seed`. */
function fnv1a(text: string, seed: number): number {
  let hash = seed;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

/** RFC 4122 version 8 (custom): the bits come from our own hash, not from time, random or SHA-1 (MVR spec Table 1). */
const VERSION = '8';

/**
 * An RFC 4122 uuid (version 8, variant `10xx`) derived only from `key`.
 * MVR needs a uuid on every object, and a random one would make two exports
 * of the same design differ; a hash of a stable key (for example `theatre|truss|front`) keeps the files byte-identical
 * and keeps an object's uuid when the design is exported again. It is an id, not a cryptographic hash.
 */
export function stableUuid(key: string): string {
  const hex = SEEDS.map((seed) => fnv1a(key, seed).toString(16).padStart(8, '0'))
    .join('')
    .toUpperCase();
  const variant = ((parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16).toUpperCase();
  const clock = `${variant}${hex.slice(17, 20)}`;
  return [hex.slice(0, 8), hex.slice(8, 12), `${VERSION}${hex.slice(13, 16)}`, clock, hex.slice(20)].join('-');
}
