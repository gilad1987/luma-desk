import type { WaIconName } from '../wa/waIcons';
import { startIcon } from './startIcon';

/** One bar button: its id (the tooltip's `for`), the data hook its code finds it by, the icon, label and tooltip. */
export interface IconButton {
  readonly id: string;
  /** The data attribute the owning class queries, for example `data-edit="undo"`. */
  readonly hook: string;
  readonly icon: WaIconName;
  /** The English label, as on the rest of the desk. */
  readonly label: string;
  /** The Hebrew tooltip from `he.builder`. */
  readonly tip: string;
}

/** The Web Awesome `appearance`: `plain` for the edit buttons (no border), `outlined` for the mode group. */
export type IconButtonAppearance = 'plain' | 'outlined';

/**
 * The markup of a `wa-button` with a start icon and its `wa-tooltip`. The tooltip replaces the old `title` attribute:
 * it is styled with the builder and also shows on keyboard focus. The edit toolbar and the view-mode switch both build
 * their buttons with it, so the two rows cannot drift apart; only their `appearance` differs (toolbar.md).
 */
export function iconButton(button: IconButton, appearance: IconButtonAppearance): string {
  return (
    `<wa-button id="${button.id}" ${button.hook} appearance="${appearance}">${startIcon(button.icon)}${button.label}` +
    `</wa-button>\n<wa-tooltip for="${button.id}">${button.tip}</wa-tooltip>`
  );
}
