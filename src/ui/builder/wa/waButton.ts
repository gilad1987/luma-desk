/**
 * Turns a `wa-button` off or on. It sets both forms of the state: the `disabled` attribute, which the component reads
 * before it upgrades and which the builder's CSS selects on, and the `disabled` property, which an upgraded element
 * reads (a property set after the upgrade does not always reflect back to the attribute in time for the next check).
 */
export function setWaDisabled(button: HTMLElement, isOff: boolean): void {
  button.toggleAttribute('disabled', isOff);
  if ('disabled' in button) button.disabled = isOff;
}
