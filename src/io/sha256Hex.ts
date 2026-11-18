/**
 * The SHA-256 of `bytes` as lower-case hex: the IndexedDB key of an MVR file and the show's `source.fileHash`. A
 * content hash means a file imported twice is stored once, and the show finds its file again after a reload.
 */
export async function sha256Hex(subtle: SubtleCrypto, bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
