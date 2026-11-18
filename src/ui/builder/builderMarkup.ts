import { he } from '../../i18n/he';

/**
 * The builder screen inside its `section.builder` host: the bar (title, edit tools, count, Cancel, Done), the start
 * screen, and the two slots the tool tabs and the top view mount into. The middle stays empty, so the 3D view shows.
 */
export const builderMarkup = `<header class="builder-bar">
  <span class="builder-title">Stage Builder</span>
  <div class="edit-tools"></div>
  <span class="count-badge"></span>
  <button class="builder-btn" data-builder="cancel" title="${he.builder.cancel}">Cancel</button>
  <button class="builder-btn is-primary" data-builder="done" title="${he.builder.done}">Done</button>
</header>
<div class="start-screen"></div>
<aside class="builder-tools"></aside>
<aside class="builder-view"></aside>`;

/** The edit buttons; `data-edit` names the `EditToolbar` action, the Hebrew title says what it does and its key. */
export const editToolbarMarkup = `<button data-edit="undo" title="${he.builder.edit.undo}">Undo</button>
<button data-edit="redo" title="${he.builder.edit.redo}">Redo</button>
<button data-edit="duplicate" title="${he.builder.edit.duplicate}">Duplicate</button>
<button data-edit="delete" title="${he.builder.edit.delete}">Delete</button>
<button data-edit="mirror" title="${he.builder.edit.mirror}">Mirror L → R</button>`;
