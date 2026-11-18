/** One 3DS chunk: u16 id, u32 length including the 6-byte header, then the body. */
export function tdsChunk(id: number, ...parts: readonly Uint8Array[]): Uint8Array {
  const length = 6 + parts.reduce((sum, part) => sum + part.byteLength, 0);
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, id, true);
  view.setUint32(2, length, true);
  let at = 6;
  for (const part of parts) {
    bytes.set(part, at);
    at += part.byteLength;
  }
  return bytes;
}
