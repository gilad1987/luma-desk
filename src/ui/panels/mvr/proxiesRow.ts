import { createElement } from '../../shared';

/**
 * The "Show proxies" row of the layer list: one box, checked at first, as proxies are drawn by default. Proxies are
 * shapes the import inferred for objects without geometry, so the user can take them all out of the picture at once
 * and still hide single layers below. The label is English inline, like the other summary labels.
 */
export function proxiesRow(host: HTMLElement, onChange: (shown: boolean) => void): HTMLInputElement {
  const row = createElement('label', 'mvrLayer');
  const box = createElement('input');
  box.type = 'checkbox';
  box.id = 'mvrShowProxies';
  box.checked = true;
  box.onchange = () => onChange(box.checked);
  const name = createElement('span');
  name.textContent = 'Show proxies';
  row.appendChild(box);
  row.appendChild(name);
  host.appendChild(row);
  return box;
}
