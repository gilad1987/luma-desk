import { readPalette, type TopViewPalette } from './topViewPalette';

/**
 * The top view canvas with its backing size kept equal to its CSS box, and the palette read with it. Both run only
 * when the box size changes: writing `width` clears the canvas and reallocates its buffer, and `getComputedStyle`
 * forces a style pass, and the view draws on every drag frame. So a theme change shows after the next resize.
 * The box is read once on the first frame and then only when the `ResizeObserver` fires, because `offsetWidth` on a
 * drag frame forces a layout; the observer runs after a layout, where the read costs nothing.
 */
export class TopViewCanvas {
  readonly #element: HTMLCanvasElement;
  readonly #observer: ResizeObserver;
  #measured = false;
  #width = 0;
  #height = 0;
  #palette: TopViewPalette | null = null;

  /** `onResize` asks the view for a frame: a resize alone changes no draft, so nothing else would repaint. */
  constructor(element: HTMLCanvasElement, onResize: () => void) {
    this.#element = element;
    this.#observer = new ResizeObserver(() => {
      if (this.#measure()) onResize();
    });
    this.#observer.observe(element);
  }

  /** The palette for this frame; first resizes the canvas to its box when the box changed since the last frame. */
  fit(): TopViewPalette {
    if (!this.#measured) this.#measure();
    if (this.#palette) return this.#palette;
    const element = this.#element;
    if (this.#width > 0 && this.#height > 0) {
      element.width = this.#width;
      element.height = this.#height;
    }
    this.#palette = readPalette(element);
    return this.#palette;
  }

  /** Stops observing the canvas box; the view calls it when it leaves. */
  dispose(): void {
    this.#observer.disconnect();
  }

  /**
   * Reads the box; a changed box drops the palette, so the next frame refits the canvas. True when the box changed.
   * The first frame measures without `onResize`, because that frame is already painting.
   */
  #measure(): boolean {
    this.#measured = true;
    const { offsetWidth: width, offsetHeight: height } = this.#element;
    if (width === this.#width && height === this.#height) return false;
    this.#width = width;
    this.#height = height;
    this.#palette = null;
    return true;
  }
}
