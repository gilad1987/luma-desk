/** The colours of the plan drawing, read from CSS (U7), so the palette lives in `_plan.scss`. */
export interface PlanPalette {
  readonly background: string;
  readonly grid: string;
  readonly deck: string;
  readonly riser: string;
  readonly screen: string;
  readonly truss: string;
  readonly fixture: string;
  readonly selected: string;
}

/** Reads the `--plan-*` custom properties of `el`; `PlanCanvas` calls it only when the canvas box changes. */
export function readPalette(el: Element): PlanPalette {
  const style = getComputedStyle(el);
  const read = (name: string): string => style.getPropertyValue(`--plan-${name}`).trim();
  return {
    background: read('background'),
    grid: read('grid'),
    deck: read('deck'),
    riser: read('riser'),
    screen: read('screen'),
    truss: read('truss'),
    fixture: read('fixture'),
    selected: read('selected'),
  };
}
