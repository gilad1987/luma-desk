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

/** The Web Awesome `appearance`: `plain` for the edit buttons (no border), the only bar buttons built here. */
export type IconButtonAppearance = 'plain';

/**
 * The markup of a `wa-button` with a start icon and its `wa-tooltip`. The tooltip is styled with the builder and also
 * shows on keyboard focus. The edit toolbar builds its buttons with it; the mode radios are native buttons
 * (`ViewModeSwitch`), drawn to match.
 *
 * The tooltip's text is also the `aria-description`, which `describeWaButtons` copies to the inner button, the element
 * that takes the focus. The tooltip's own `aria-labelledby` lands on the host, which has no role, so without it a screen
 * reader would hear the label and never the help or the key. Not a `title`: that also opens the browser's own tooltip.
 */
export function iconButton(button: IconButton, appearance: IconButtonAppearance): string {
  return (
    `<wa-button id="${button.id}" ${button.hook} appearance="${appearance}" aria-description="${button.tip}">` +
    `${startIcon(button.icon)}${button.label}</wa-button>\n` +
    `<wa-tooltip for="${button.id}" dir="rtl">${button.tip}</wa-tooltip>`
  );
}
