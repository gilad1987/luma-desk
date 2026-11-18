/** Characters Windows or macOS refuse in a file name, and control characters; a show name may hold them. */
const UNSAFE_CHARACTERS = /[\\/:*?"<>|\p{Cc}]/gu;

/** Dots and spaces at the end of a name, which Windows silently removes. */
const TRAILING_DOTS_AND_SPACES = /[. ]+$/;

/** Device names Windows reserves, alone or before an extension, in any case. */
const RESERVED_NAME = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;

/** Most file systems allow 255 bytes per name; 200 leaves room for ".mvr" and a " (1)" the browser may add. */
const MAX_NAME_BYTES = 200;

/** The name a show without one downloads as. */
const FALLBACK_NAME = 'luma-desk';

/** The longest start of `name` that fits in `maxBytes` of UTF-8, cut between characters, never inside one. */
function cutToBytes(name: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  let length = 0;
  let cut = '';
  for (const character of name) {
    length += encoder.encode(character).length;
    if (length > maxBytes) break;
    cut += character;
  }
  return cut;
}

/**
 * `<show name>.mvr` (contract §8) that Windows, macOS and Linux accept as it is: refused and control characters
 * replaced, cut to a safe length, no trailing dot or space and no reserved device name. Hebrew names stay as they are.
 */
export function mvrFileName(showName: string): string {
  const cleaned = cutToBytes(showName.trim().replace(UNSAFE_CHARACTERS, '_'), MAX_NAME_BYTES);
  const name = cleaned.replace(TRAILING_DOTS_AND_SPACES, '').trim();
  if (name === '') return `${FALLBACK_NAME}.mvr`;
  return `${RESERVED_NAME.test(name) ? `_${name}` : name}.mvr`;
}
