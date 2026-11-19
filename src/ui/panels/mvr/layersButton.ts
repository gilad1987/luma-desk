import { he } from '../../../i18n/he';

/**
 * The "Layers" group of the top bar, made beside the Haze group the first time an MVR stage is drawn: the markup of
 * the top bar stays that of the built-in desk, which has no file layers. Nothing where no page stands (a unit test of
 * the app wiring) or the top bar is not built.
 */
function layersGroup(make: boolean): { group: HTMLElement; button: HTMLButtonElement } | undefined {
  if (typeof document === 'undefined') return undefined;
  const group = document.getElementById('mvrLayersGroup');
  const button = document.getElementById('mvrLayersOpen');
  if (group && button instanceof HTMLButtonElement) return { group, button };
  const haze = document.getElementById('haze')?.parentElement;
  if (!make || !haze) return undefined;
  const made = { group: document.createElement('div'), button: document.createElement('button') };
  made.group.className = 'tbg';
  made.group.id = 'mvrLayersGroup';
  made.button.id = 'mvrLayersOpen';
  made.button.textContent = 'Layers';
  made.button.title = he.mvr.layersOpenTip;
  made.group.append(made.button);
  haze.after(made.group);
  return made;
}

/**
 * Shows the top bar's "Layers" button for the MVR stage now drawn, or hides it (`undefined`) for a stage that is not
 * an MVR file. `open` opens the layer list of the current stage.
 */
export function showLayersButton(open: (() => void) | undefined): void {
  const bar = layersGroup(open !== undefined);
  if (!bar) return;
  bar.group.style.display = open ? '' : 'none';
  bar.button.onclick = open ?? null;
}
