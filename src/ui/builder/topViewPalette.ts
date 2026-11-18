/** The colours of the top view drawing, read from CSS (U7), so the palette lives in `_topview.scss`. */
export interface TopViewPalette {
  readonly background: string;
  readonly grid: string;
  readonly deck: string;
  readonly riser: string;
  readonly screen: string;
  readonly truss: string;
  readonly fixture: string;
  readonly selected: string;
}

/** Reads the `--top-view-*` custom properties of `el`; `TopViewCanvas` calls it only when the canvas box changes. */
export function readPalette(el: Element): TopViewPalette {
  const style = getComputedStyle(el);
  const read = (name: string): string => style.getPropertyValue(`--top-view-${name}`).trim();
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
