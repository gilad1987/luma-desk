import { he } from '../../../i18n/he';
import { iconSvg } from '../wa/waIcons';
import { iconButton } from './iconButton';

/**
 * The narrow screen's inspector drawer (`InspectorDrawer`): an `aside` under the bar at the end edge, not a modal, so
 * the bar stays usable while it is open. `.inspector-drawer` is its body, the tools slot; the frame with the title and
 * the Close button stays put when the tools move to the column.
 */
const drawerMarkup = `<aside id="builder-inspector-drawer" class="inspector-drawer-frame" tabindex="-1" aria-labelledby="builder-inspector-drawer-title" hidden>
  <div class="inspector-drawer-head">
    <h2 id="builder-inspector-drawer-title" class="inspector-drawer-title">Inspector</h2>
    ${iconButton({ id: 'builder-inspector-close', hook: 'data-builder="inspector-close"', icon: 'close', label: 'Close', tip: he.builder.shell.inspectorClose }, 'plain')}
  </div>
  <div class="inspector-drawer"></div>
</aside>`;

/**
 * The three columns under the builder bar: the library (a placeholder until the fixture library arrives), the centre
 * with the 3D pane and the plan pane in one `wa-split-panel`, and the inspector column. The drawer is the inspector's
 * second home below 1100 px (`InspectorHost`). The split panel's start pane is the 3D view, so its `position` is the
 * 3D share in percent. The start screen covers these columns until a choice; they are laid out from the start, so the
 * 3D pane never begins at a 0 px box.
 */
export const shellMarkup = `<aside class="builder-library">
  <h2 id="builder-library-title" class="library-title">${iconSvg('library')}<span class="library-label">Library</span></h2>
  <wa-tooltip for="builder-library-title" dir="rtl">${he.builder.shell.library}</wa-tooltip>
  <p class="library-hint">The fixture library arrives in the next update.</p>
</aside>
<div class="builder-centre is-mode-split">
  <wa-split-panel class="centre-split" orientation="vertical" primary="start" position="50">
    <div slot="start" class="builder-3d"></div>
    <div slot="end" class="builder-plan"></div>
  </wa-split-panel>
</div>
<aside class="builder-inspector"></aside>
${drawerMarkup}`;
