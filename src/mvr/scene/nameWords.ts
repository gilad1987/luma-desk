/**
 * A name's words in lower case, so the name rules of the import (LED surfaces, hall layers) match whole words only.
 * Words break at anything but letters and digits and where an upper-case run meets a capitalised word (`LEDWall` is
 * `led`, `wall`), so letters inside a word (`Angled`) never form a word of their own. Letters without case, such as
 * Hebrew, form words of their own runs.
 */
export function nameWords(name: string): string[] {
  return (name.match(/\p{Lu}+(?!\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lo}+|\d+/gu) ?? []).map((word) => word.toLowerCase());
}
