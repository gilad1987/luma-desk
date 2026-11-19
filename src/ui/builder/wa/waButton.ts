import { setWaInnerAria } from './waInnerAria';

/**
 * Turns a `wa-button` off or on. It sets both forms of the state: the `disabled` attribute, which the component reads
 * before it upgrades and which the builder's CSS selects on, and the `disabled` property, which an upgraded element
 * reads (a property set after the upgrade does not always reflect back to the attribute in time for the next check).
 */
export function setWaDisabled(button: HTMLElement, isOff: boolean): void {
  button.toggleAttribute('disabled', isOff);
  if ('disabled' in button) button.disabled = isOff;
}

/**
 * Gives every `wa-button` under `root` that has an `aria-description` (its Hebrew help, from the markup) the same
 * description on its inner button, where a screen reader hears it (`setWaInnerAria`). The help is not a `title`: a
 * `title` would also open the browser's own tooltip next to the `wa-tooltip`. Call it once the buttons are in the page.
 */
export function describeWaButtons(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('wa-button[aria-description]').forEach((button) => {
    void setWaInnerAria(button, 'aria-description', button.getAttribute('aria-description'));
  });
}
