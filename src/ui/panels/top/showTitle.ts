import { DEMO_TITLE } from './topBarMarkup';

/**
 * Shows `name` as the stage title in the top bar, or the demo show's title for null. The name comes from a user's
 * file, so it is set as text, never as markup. A long name is cut with an ellipsis in the bar, so the tooltip holds the
 * whole name, and `dir = auto` lets a Hebrew name read right to left in the left-to-right bar. Nothing to do before
 * the bar renders (or without a DOM, in unit tests).
 */
export function showTitle(name: string | null): void {
  const title = typeof document === 'undefined' ? null : document.getElementById('showName');
  if (!title) return;
  title.textContent = name ?? DEMO_TITLE;
  title.title = name ?? DEMO_TITLE;
  title.dir = 'auto';
}
