import { byId } from '../../dom';
import { boxBetween, fixturesInBox } from './fixturesInBox';
import type { ViewportDeps } from './ViewportDeps';
import { wireFixtureTooltip } from './wireFixtureTooltip';

/** Below this travel a release is a click; above it a Shift drag is a box. Exactly 5 px is neither. */
const CLICK_SLOP_PX = 5;

interface Press {
  readonly x: number;
  readonly y: number;
  readonly shift: boolean;
  /** Shift with the primary button: draw a selection box instead of orbiting. */
  readonly box: boolean;
}

/**
 * Selection in the 3D view: click picks a fixture (Shift toggles it), Shift+drag draws `#selRect` and adds every
 * fixture inside. The press is taken on the canvas but moves and releases on the window, so a drag that leaves the
 * canvas still ends.
 */
export class ViewportPicking {
  #press: Press | null = null;
  readonly #deps: ViewportDeps;
  readonly #viewer: HTMLElement;
  readonly #rect: HTMLElement;

  /** Adds the canvas and window listeners, then the hover tooltip, in the original order. */
  constructor(deps: ViewportDeps) {
    this.#deps = deps;
    this.#viewer = byId('viewer');
    this.#rect = byId('selRect');
    deps.canvas.addEventListener('pointerdown', (ev) => {
      const box = ev.shiftKey && ev.button === 0;
      this.#press = { x: ev.clientX, y: ev.clientY, shift: ev.shiftKey, box };
      if (box) deps.controls.enabled = false;
    });
    window.addEventListener('pointermove', (ev) => this.#drag(ev));
    window.addEventListener('pointerup', (ev) => this.#release(ev));
    wireFixtureTooltip(deps, () => this.#press !== null);
  }

  #drag(ev: PointerEvent): void {
    const press = this.#press;
    if (!press?.box) return;
    const r = this.#viewer.getBoundingClientRect(),
      style = this.#rect.style;
    style.display = 'block';
    style.left = `${Math.min(press.x, ev.clientX) - r.left}px`;
    style.top = `${Math.min(press.y, ev.clientY) - r.top}px`;
    style.width = `${Math.abs(ev.clientX - press.x)}px`;
    style.height = `${Math.abs(ev.clientY - press.y)}px`;
  }

  #release(ev: PointerEvent): void {
    const press = this.#press;
    if (!press) return;
    const { canvas, picker, camera, fixtures, selection, bus, controls } = this.#deps;
    const moved = Math.hypot(ev.clientX - press.x, ev.clientY - press.y);
    if (press.box && moved > CLICK_SLOP_PX) {
      const box = boxBetween(press.x, press.y, ev.clientX, ev.clientY);
      const hits = fixturesInBox(fixtures, camera, canvas.getBoundingClientRect(), box);
      selection.set(
        hits.map((f) => f.id),
        'add',
      );
      bus.emit('message', { kind: 'log', text: `Box select +${hits.length}`, level: 'ok' });
    } else if (moved < CLICK_SLOP_PX && ev.target === canvas) {
      const f = picker.pickAt(ev.clientX, ev.clientY);
      if (f) {
        selection.set([f.id], press.shift ? 'toggle' : 'replace');
        bus.emit('message', { kind: 'log', text: `Fixture ${f.id} (${f.T.name})`, level: 'ok' });
      }
    }
    this.#rect.style.display = 'none';
    controls.enabled = true;
    this.#press = null;
  }
}
