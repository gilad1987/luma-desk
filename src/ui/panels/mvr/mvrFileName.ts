/**
 * Characters Windows or macOS refuse in a file name, control characters, and lone surrogates, which UTF-8 cannot
 * encode (a file system would store U+FFFD instead); a show name may hold any of them.
 */
const UNSAFE_CHARACTERS = /[\\/:*?"<>|\p{Cc}\p{Cs}]/gu;

/** Dots and spaces at the end of a name, which would give names like "show..mvr" or "show .mvr". */
const TRAILING_DOTS_AND_SPACES = /[. ]+$/;

/**
 * Device names Windows reserves, in any case: alone, or before an extension after optional spaces, because Windows
 * trims those spaces ("CON .txt" is CON). The ports include 0 and the superscript digits ¹ ² ³.
 */
const RESERVED_NAME = /^(CON|PRN|AUX|NUL|COM[0-9¹²³]|LPT[0-9¹²³]|CONIN\$|CONOUT\$) *(\.|$)/i;

/** Most file systems allow 255 bytes per name; 200 leaves room for ".mvr" and a " (1)" the browser may add. */
const MAX_NAME_BYTES = 200;

/** The name a show without one downloads as. */
const FALLBACK_NAME = 'luma-desk';

/** User-perceived characters: a letter with its combining marks or niqqud, or a ZWJ emoji, is one segment. */
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** The longest start of `name` that fits in `maxBytes` of UTF-8, cut between graphemes, never inside one. */
function cutToBytes(name: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  let length = 0;
  let cut = '';
  for (const { segment } of GRAPHEMES.segment(name)) {
    length += encoder.encode(segment).length;
    if (length > maxBytes) break;
    cut += segment;
  }
  return cut;
}

/**
 * `<show name>.mvr` (contract §8) that Windows, macOS and Linux accept as it is: refused and control characters
 * replaced, cut to a safe length, no trailing dot or space and no reserved device name. A name that would start with
 * a dot gets a prefix too, since macOS and Linux hide such a file. Hebrew names stay as they are.
 */
export function mvrFileName(showName: string): string {
  const cleaned = cutToBytes(showName.trim().replace(UNSAFE_CHARACTERS, '_'), MAX_NAME_BYTES);
  const name = cleaned.replace(TRAILING_DOTS_AND_SPACES, '').trim();
  if (name === '') return `${FALLBACK_NAME}.mvr`;
  const needsPrefix = RESERVED_NAME.test(name) || name.startsWith('.');
  return `${needsPrefix ? `_${name}` : name}.mvr`;
}
