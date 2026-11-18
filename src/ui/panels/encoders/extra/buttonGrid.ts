import { createElement } from '../../../shared';

/** One grid button: its label (HTML), its click action and an optional class. */
export type GridButton = readonly [label: string, action: () => void, className?: string];

/** A `.btnGrid` of buttons in `cols` columns, in item order. */
export function buttonGrid(cols: number, items: readonly GridButton[]): HTMLDivElement {
  const grid = createElement('div', 'btnGrid');
  grid.style.gridTemplateColumns = `repeat(${cols},auto)`;
  for (const [label, action, className] of items) {
    const b = createElement('button', className || '', label);
    b.onclick = action;
    grid.appendChild(b);
  }
  return grid;
}
