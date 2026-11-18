import { readPalette, type TopViewPalette } from './topViewPalette';

/**
 * The top view canvas with its backing size kept equal to its CSS box, and the palette read with it. Both run only
 * when the box size changes: writing `width` clears the canvas and reallocates its buffer, and `getComputedStyle`
 * forces a style pass, and the view draws on every drag frame. So a theme change shows after the next resize.
 */
export class TopViewCanvas {
  readonly #element: HTMLCanvasElement;
  #box = '';
  #palette: TopViewPalette | null = null;

  constructor(element: HTMLCanvasElement) {
    this.#element = element;
  }

  /** The palette for this frame; first resizes the canvas to its box when the box changed since the last frame. */
  fit(): TopViewPalette {
    const element = this.#element;
    const { offsetWidth: width, offsetHeight: height } = element;
    const box = `${width}x${height}`;
    if (this.#palette && box === this.#box) return this.#palette;
    this.#box = box;
    if (width > 0 && height > 0) {
      element.width = width;
      element.height = height;
    }
    this.#palette = readPalette(element);
    return this.#palette;
  }
}
