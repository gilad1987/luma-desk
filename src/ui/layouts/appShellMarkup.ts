import { guideMarkup } from '../guide/guideMarkup';
import { DESK_CONSOLE_MARKUP } from './deskConsoleMarkup';
import { MA_CONSOLE_MARKUP } from './maConsoleMarkup';

/**
 * The markup the panels own, placed into the shell by the integrator (`03-ui.md` §7 owner table). `header#top` and
 * `section#enc` are not slots: `TopBar` and `EncodersPanel` render those elements themselves (at the start of `#app`
 * and right after `#main`), so a shell copy would put each in the page twice.
 */
export interface ShellSlots {
  /** Children of `section#viewer` (`viewerMarkup`). */
  readonly viewer: string;
  /** Children of `aside#side`. */
  readonly side: string;
  /** Children of `footer#desk`. */
  readonly desk: string;
}

/**
 * The page body below the root element: the `#app` grid with the layout containers and both consoles, then the
 * overlays (guide, tour, modal, toast). It must be in the DOM before any panel looks up its ids.
 */
export const appShellMarkup = (s: ShellSlots): string => `<div id="app">
<main id="main">
<section id="viewer">${s.viewer}</section>
<aside id="side">${s.side}</aside>
</main>
${DESK_CONSOLE_MARKUP}
${MA_CONSOLE_MARKUP}
<footer id="desk">${s.desk}</footer>
</div>
${guideMarkup()}
<div id="modal"><div class="mbox" id="mbox"></div></div>
<div id="toast"></div>`;
