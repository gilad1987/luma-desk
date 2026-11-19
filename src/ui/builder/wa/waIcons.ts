import { WA_ICON_PATHS } from './waIconPaths';

/** The icons of the builder toolbar and panes. */
export type WaIconName =
  'undo' | 'redo' | 'duplicate' | 'delete' | 'mirror' | 'plan' | 'split' | 'cube' | 'inspector' | 'library' | 'close';

/**
 * The inline SVG of icon `name`, for a `wa-button` slot. It is inline (no `wa-icon`, no fetch) so the builder works
 * offline; it strokes in `currentColor` so it follows the button's text colour, and it is hidden from assistive
 * technology because the button carries the label.
 */
export function iconSvg(name: WaIconName): string {
  return (
    '<svg class="wa-icon-svg" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    `${WA_ICON_PATHS[name]}</svg>`
  );
}
