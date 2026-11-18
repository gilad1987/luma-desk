import { readFileSync } from 'node:fs';

/**
 * The whole original page (index.html at 48a3b63, the frozen source of the refactor), byte for byte. The copy is
 * checked in instead of read from the commit, so the oracle does not depend on git history: the tests also pass in a
 * shallow clone, a `git archive` copy or a source zip. Prettier ignores the file, so its bytes never change.
 */
export function legacyPage(): string {
  return readFileSync(new URL('./original-index.html', import.meta.url), 'utf8');
}
