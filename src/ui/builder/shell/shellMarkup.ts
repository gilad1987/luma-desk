import { he } from '../../../i18n/he';
import { iconSvg } from '../wa/waIcons';

/**
 * The three columns under the builder bar: the library (a placeholder until the fixture library arrives), the centre
 * with the 3D pane and the plan pane in one `wa-split-panel`, and the inspector column. The drawer is the inspector's
 * second home below 1100 px (`InspectorHost`). The split panel's start pane is the 3D view, so its `position` is the
 * 3D share in percent. The start screen covers these columns until a choice; they are laid out from the start, so the
 * 3D pane never begins at a 0 px box.
 */
export const shellMarkup = `<aside class="builder-library">
  <h2 id="builder-library-title" class="library-title">${iconSvg('library')}<span class="library-label">Library</span></h2>
  <wa-tooltip for="builder-library-title">${he.builder.shell.library}</wa-tooltip>
  <p class="library-hint">The fixture library arrives in the next update.</p>
</aside>
<div class="builder-centre is-mode-split">
  <wa-split-panel class="centre-split" orientation="vertical" primary="start" position="50">
    <div slot="start" class="builder-3d"></div>
    <div slot="end" class="builder-plan"></div>
  </wa-split-panel>
</div>
<aside class="builder-inspector"></aside>
<wa-drawer class="inspector-drawer" placement="end" label="Inspector" light-dismiss></wa-drawer>`;
