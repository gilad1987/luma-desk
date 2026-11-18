import { mvrNameWords } from '../../i18n/he/mvrNameWords';
import { nameWords } from './nameWords';

/** Whole words that say an object is an LED tile or a screen surface; the Hebrew ones are those of the screen rule. */
const PANEL_WORDS: ReadonlySet<string> = new Set([
  ...['led', 'panel', 'panels', 'screen', 'screens', 'tile', 'tiles'],
  ...mvrNameWords.screen,
]);

/** Whole words that say an object is an audience seat. */
const SEAT_WORDS: ReadonlySet<string> = new Set(['chair', 'chairs', 'seat', 'seats', ...mvrNameWords.seat]);

/** The kind one name says; nothing when it says neither or both, as a name with both words decides nothing. */
function kindOfName(name: string): 'panel' | 'seat' | undefined {
  const words = nameWords(name);
  const panel = words.some((word) => PANEL_WORDS.has(word));
  const seat = words.some((word) => SEAT_WORDS.has(word));
  if (panel === seat) return undefined;
  return panel ? 'panel' : 'seat';
}

/**
 * The kind the first deciding name says. Pass the names from the most specific to the least (Symdef, objects,
 * layer), so a chair Symdef on a layer named after the LED wall is a seat. It matches whole words only
 * (`nameWords`), in English and Hebrew; a name in another language or an abbreviation decides nothing.
 */
export function namedProxyKind(names: readonly string[]): 'panel' | 'seat' | undefined {
  for (const name of names) {
    const kind = kindOfName(name);
    if (kind) return kind;
  }
  return undefined;
}
