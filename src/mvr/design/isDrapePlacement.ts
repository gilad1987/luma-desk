import { mvrNameWords } from '../../i18n/he/mvrNameWords';
import type { MeshPlacement } from '../scene/MvrScene';
import { nameWords } from '../scene/nameWords';

/** Object-name words for a stage drape or curtain; Vectorworks names its drape objects "Soft Goods". */
const DRAPE_WORDS: ReadonlySet<string> = new Set([
  ...['curtain', 'curtains', 'drape', 'drapes', 'drapery', 'softgoods'],
  ...mvrNameWords.drape,
]);

/** Two-word names of a drape: each word alone means something else ("soft", a screen, cloth). */
const DRAPE_PAIRS: readonly (readonly [string, string])[] = [['soft', 'goods'], ...mvrNameWords.drapePairs];

function isDrapeName(name: string): boolean {
  const words = nameWords(name);
  return words.some(
    (word, i) => DRAPE_WORDS.has(word) || DRAPE_PAIRS.some(([first, next]) => word === first && words[i + 1] === next),
  );
}

/**
 * Whether a placed mesh is a drape: its object or its symbol is named as one. The scene keeps no class, so the
 * names are the data the import has; a layer of drapes only starts hidden (`hallLayers`) and is never dropped.
 */
export function isDrapePlacement(placement: Pick<MeshPlacement, 'name' | 'symdef'>): boolean {
  return isDrapeName(placement.name) || isDrapeName(placement.symdef ?? '');
}
