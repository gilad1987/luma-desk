import { he } from '../../i18n/he';
import { startIcon } from './shell/startIcon';

/**
 * The builder bar inside its `section.builder` host (title, edit tools, view modes, count, Inspector, Cancel, Done)
 * and the start screen. `mountShell` appends the columns after them (`shell/shellMarkup.ts`). The Inspector button is
 * shown only on a narrow screen, where the inspector moves into a drawer. Each button has a Hebrew `wa-tooltip`.
 */
export const builderMarkup = `<header class="builder-bar">
  <span class="builder-title">Stage Builder</span>
  <div class="edit-tools"></div>
  <div class="view-modes"></div>
  <span class="count-badge"></span>
  <wa-button id="builder-inspector" class="builder-btn is-narrow-only" data-builder="inspector" appearance="outlined">${startIcon('inspector')}Inspector</wa-button>
  <wa-tooltip for="builder-inspector">${he.builder.shell.inspector}</wa-tooltip>
  <wa-button id="builder-cancel" class="builder-btn" data-builder="cancel" appearance="outlined">Cancel</wa-button>
  <wa-tooltip for="builder-cancel">${he.builder.cancel}</wa-tooltip>
  <wa-button id="builder-done" class="builder-btn is-primary" data-builder="done" variant="brand">Done</wa-button>
  <wa-tooltip for="builder-done">${he.builder.done}</wa-tooltip>
</header>
<div class="start-screen"></div>`;
