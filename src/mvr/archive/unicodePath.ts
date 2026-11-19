/** The Info-ZIP Unicode Path extra field: the UTF-8 name of an entry whose standard name is in a local code page. */
const UNICODE_PATH = 0x7075;

/** CRC-32 (the ZIP polynomial) of `bytes`, bit by bit: names are short, so a table would save nothing. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * The UTF-8 name in the Unicode Path field of an entry's extra data, or `undefined` when there is none. Writers on
 * systems with a non-Western code page (Hebrew, Cyrillic) store the name in that code page and put the real name
 * here. The field holds the CRC-32 of the standard name: when it does not match, another tool renamed the entry and
 * the field is stale, so it is not used (APPNOTE 4.6.9). A name with a folder is kept: GDTF model files live in
 * `models/<format>/`, and the MVR archive drops entries in folders by the decoded name itself.
 */
export function unicodePath(extra: Uint8Array, standardName: Uint8Array): string | undefined {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  let at = 0;
  while (at + 4 <= extra.length) {
    const end = at + 4 + view.getUint16(at + 2, true);
    if (end > extra.length) return undefined;
    if (view.getUint16(at, true) === UNICODE_PATH && end - at >= 9) {
      if (view.getUint8(at + 4) !== 1 || view.getUint32(at + 5, true) !== crc32(standardName)) return undefined;
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(extra.subarray(at + 9, end));
      } catch {
        return undefined;
      }
    }
    at = end;
  }
  return undefined;
}
