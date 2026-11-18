import type { LayoutMode } from '../panels/layoutMode';
import { byId } from '../dom';
import { deskInfoTexts, maInfoTexts, type ConsoleInfoState } from './consoleInfoTexts';

/** How often the console labels refresh, in ms. */
const INFO_INTERVAL_MS = 250;

/**
 * Refreshes the console info labels every 250 ms: the MA screen headers or the desk wing labels, nothing in classic.
 * A timer and not the frame tick, as before, so the labels lag the state by up to 250 ms.
 */
export function startConsoleInfo(mode: () => LayoutMode, state: () => ConsoleInfoState): void {
  setInterval(() => {
    if (mode() === 'ma') {
      const t = maInfoTexts(state());
      byId('d1info').textContent = t.d1;
      byId('d2info').textContent = t.d2;
      byId('d3info').textContent = t.d3;
      return;
    }
    if (mode() !== 'desk') return;
    const t = deskInfoTexts(state());
    byId('cwPbInfo').textContent = t.playback;
    byId('cwProgInfo').textContent = t.programmer;
    byId('cwScreenInfo').textContent = t.screen;
  }, INFO_INTERVAL_MS);
}
