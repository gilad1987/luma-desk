import { guideMarkup } from '../guide/guideMarkup';
import { DESK_CONSOLE_MARKUP } from './deskConsoleMarkup';
import { MA_CONSOLE_MARKUP } from './maConsoleMarkup';

/** The markup the panels own, placed into the shell by the integrator (`03-ui.md` §7 owner table). */
export interface ShellSlots {
  /** Children of `header#top`. */
  readonly top: string;
  /** Children of `section#viewer`. */
  readonly viewer: string;
  /** Children of `aside#side`. */
  readonly side: string;
  /** Children of `section#enc`. */
  readonly enc: string;
  /** Children of `footer#desk`. */
  readonly desk: string;
}

/**
 * The page body below the root element: the `#app` grid with the layout containers and both consoles, then the
 * overlays (guide, tour, modal, toast). It must be in the DOM before any panel looks up its ids.
 */
export const appShellMarkup = (s: ShellSlots): string => `<div id="app">
<header id="top">${s.top}</header>
<main id="main">
<section id="viewer">${s.viewer}</section>
<aside id="side">${s.side}</aside>
</main>
<section id="enc">${s.enc}</section>
${DESK_CONSOLE_MARKUP}
${MA_CONSOLE_MARKUP}
<footer id="desk">${s.desk}</footer>
</div>
${guideMarkup()}
<div id="modal"><div class="mbox" id="mbox"></div></div>
<div id="toast"></div>`;
