import type { DeskLayout } from '../../show';
import { byId } from '../dom';
import type { LayoutMode } from '../panels/layoutMode';
import { DeskFit } from './DeskFit';
import { MA_SIZE } from './fitMath';
import type { LayoutHost } from './LayoutHost';
import { PanelPlacement } from './PanelPlacement';
import { toLayoutMode } from './toLayoutMode';

/**
 * Switches between the MA console, the desk console and the classic page by moving panel nodes into console slots,
 * then refits the console and the 3D view. The choice and the grip size persist through the host's `LayoutPrefs`.
 */
export class LayoutManager {
  #settings: DeskLayout = { deskMode: 'ma', deskZoom: 'auto', maSize: undefined };
  readonly #host: LayoutHost;
  readonly #placement: PanelPlacement;
  readonly #deskFit: DeskFit;

  constructor(host: LayoutHost) {
    this.#host = host;
    this.#placement = new PanelPlacement(host);
    this.#deskFit = new DeskFit((px) => host.setConsoleHeight(px));
    const modeSel = byId('layoutSel', HTMLSelectElement),
      zoomSel = byId('deskZoom', HTMLSelectElement);
    modeSel.onchange = () => {
      this.#settings = { ...this.#settings, deskMode: modeSel.value };
      this.apply();
    };
    zoomSel.onchange = () => {
      this.#settings = { ...this.#settings, deskZoom: zoomSel.value };
      this.fit();
      host.resize();
      this.save();
    };
    addEventListener('resize', () => {
      if (this.#settings.deskMode !== 'classic') this.fit();
    });
  }

  /** The mode on screen, for code that acts per layout; any unknown saved name reads as the classic page. */
  get mode(): LayoutMode {
    return toLayoutMode(this.#settings.deskMode);
  }

  /** The grip's share of the window height; undefined = adaptive. The grip refits and saves itself. */
  get maSize(): number | undefined {
    return this.#settings.maSize;
  }
  set maSize(size: number | undefined) {
    this.#settings = { ...this.#settings, maSize: size };
  }

  /** Boot: reads the saved layout (else MA at auto zoom), shows it in the selects and applies it. */
  restore(): void {
    this.#settings = this.#host.prefs.load(MA_SIZE) ?? this.#settings;
    byId('layoutSel', HTMLSelectElement).value = this.#settings.deskMode;
    byId('deskZoom', HTMLSelectElement).value = this.#settings.deskZoom;
    this.apply();
  }

  /**
   * Applies the chosen mode: places the panels, refits the console, redraws the encoders and resizes the renderer.
   * The FOH view is not the same in MA and in the other layouts, so it is set again, without a tween, when MA is
   * entered or left. Saves last, so a reload restores what is on screen.
   */
  apply(): void {
    const host = this.#host,
      wasMa = document.body.classList.contains('ma'),
      ma = this.#settings.deskMode === 'ma';
    this.#placement.place(this.#settings.deskMode);
    this.#deskFit.invalidate();
    host.renderEncoders();
    this.fit();
    host.resize();
    if (host.currentView() === 'foh' && wasMa !== ma) host.setView('foh', true);
    this.save();
  }

  /** Refits the console to the window (window resize, grip drag, zoom change). */
  fit(): void {
    this.#deskFit.fit(this.#settings);
  }

  /** Writes the layout to the host's `LayoutPrefs`; the grip calls it after a drag, the selects after a change. */
  save(): void {
    this.#host.prefs.save(this.#settings);
  }
}
