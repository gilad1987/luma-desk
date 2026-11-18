import { readFileSync } from 'node:fs';

/**
 * The exact markup of one panel in the original page (index.html at 48a3b63, the frozen source of the refactor),
 * from its first `<` to its last `>`. Stored as .txt so Prettier never reformats the oracle. Like `legacyPage`, it
 * reads a checked-in file and not git history, so it also works in a shallow clone or a source zip.
 */
export function legacyMarkup(name: string): string {
  return readFileSync(new URL(`./${name}.txt`, import.meta.url), 'utf8');
}
