/** One command line split into words: `original` keeps the typed case for labels and error text, `lower` is matched. */
export interface TokenLine {
  readonly original: readonly string[];
  readonly lower: readonly string[];
}

/**
 * Normalises and splits a command line, or returns undefined for a blank one (which must not repaint anything).
 * The rewrite order is the original's: `Go+`/`Go-` become one word before `+` and `-` are spaced out, so a minus is
 * never part of a number and a leading `-` means "subtract" (map 1.2). The rewrites also apply inside label text.
 */
export function lex(raw: string): TokenLine | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const spaced = trimmed
    .replace(/go\s*\+/gi, 'goplus ')
    .replace(/go\s*-/gi, 'gominus ')
    .replace(/@/g, ' at ')
    .replace(/\+/g, ' + ')
    .replace(/\s-\s?/g, ' - ')
    .replace(/^-/, ' - ');
  const original = spaced.split(/\s+/).filter(Boolean);
  return { original, lower: original.map((w) => w.toLowerCase()) };
}
