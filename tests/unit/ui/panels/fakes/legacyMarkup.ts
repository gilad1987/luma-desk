import { readFileSync } from 'node:fs';

/**
 * The exact markup of one panel in the original page (index.html at 48a3b63, the frozen source of the refactor),
 * from its first `<` to its last `>`. Stored as .txt so Prettier never reformats the oracle.
 */
export function legacyMarkup(name: string): string {
  return readFileSync(new URL(`../legacy/${name}.txt`, import.meta.url), 'utf8');
}
