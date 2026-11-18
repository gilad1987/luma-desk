/**
 * Whether a glTF URI names no archive file: a `data:` URI holds its bytes inline, and a `blob:` URL names bytes the
 * page already holds (GLTFLoader makes one for an image stored in the file's own buffer). The import looks up every
 * other URI in the archive and render serves it from there, so both sides need one rule; schemes are case-insensitive.
 */
export function isEmbeddedUri(uri: string): boolean {
  return /^(blob|data):/i.test(uri);
}
