import { he } from '../../i18n/he';
import { startIcon } from './shell/startIcon';

/**
 * The builder bar inside its `section.builder` host (title, edit tools, view modes, count, Inspector, Cancel, Done)
 * and the start screen. `mountShell` appends the columns after them (`shell/shellMarkup.ts`). The Inspector button is
 * shown only on a narrow screen, where the inspector moves into a drawer. Each button has a Hebrew `wa-tooltip`, and
 * the same text as its `aria-description`, which `mountShell` copies to the inner button (`describeWaButtons`). The bar
 * is an ARIA toolbar and the count badge a polite live region, so a drop's new count is announced (toolbar.md).
 */
export const builderMarkup = `<header class="builder-bar" role="toolbar" aria-label="Stage Builder">
  <span class="builder-title">Stage Builder</span>
  <div class="edit-tools" role="group" aria-label="Edit"></div>
  <div class="view-modes"></div>
  <span class="count-badge" aria-live="polite"></span>
  <wa-button id="builder-inspector" class="builder-btn is-narrow-only" data-builder="inspector" appearance="outlined" aria-description="${he.builder.shell.inspector}">${startIcon('inspector')}Inspector</wa-button>
  <wa-tooltip for="builder-inspector" dir="rtl">${he.builder.shell.inspector}</wa-tooltip>
  <wa-button id="builder-cancel" class="builder-btn" data-builder="cancel" appearance="outlined" aria-description="${he.builder.cancel}">Cancel</wa-button>
  <wa-tooltip for="builder-cancel" dir="rtl">${he.builder.cancel}</wa-tooltip>
  <wa-button id="builder-done" class="builder-btn is-primary" data-builder="done" variant="brand" aria-description="${he.builder.done}">Done</wa-button>
  <wa-tooltip for="builder-done" dir="rtl">${he.builder.done}</wa-tooltip>
</header>
<div class="start-screen"></div>`;
