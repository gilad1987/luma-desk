import { byId } from '../../ui/dom';

/**
 * Moves the 3D viewer (`#viewer`) into the builder's 3D pane and returns the disposer that puts it back as the first
 * child of `#main`, so the shell order `#viewer, #side` is restored. A move, not a second renderer: the WebGL context
 * survives a DOM move, and the renderer's ResizeObserver follows the element, so the canvas refits to the pane.
 */
export function attachViewer(pane: HTMLElement): () => void {
  const viewer = byId('viewer');
  pane.appendChild(viewer);
  return () => {
    const main = byId('main');
    main.insertBefore(viewer, main.firstChild);
  };
}
