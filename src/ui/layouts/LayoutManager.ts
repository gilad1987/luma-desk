import { byId } from '../dom';
import { ConsoleParts } from './ConsoleParts';
import { DeskFit, type LayoutSettings } from './DeskFit';
import type { LayoutHost } from './LayoutHost';
import { loadLayout, saveLayout, toLayoutMode } from './layoutStorage';

/**
 * Switches between the MA console, the desk console and the classic page by moving panel nodes into console slots,
 * then refits the console and the 3D view. The choice and the grip size persist across visits.
 */
export class LayoutManager {
  private settings: LayoutSettings = { mode: 'ma', zoom: 'auto', maSize: undefined };
  /** The tab MA forced onto screen 1 because Pools sits on screen 2; leaving MA gives Pools back. */
  private forcedTab: string | null = null;
  private readonly parts = new ConsoleParts();
  private readonly deskFit: DeskFit;

  constructor(private readonly host: LayoutHost) {
    this.deskFit = new DeskFit((px) => host.setConsoleHeight(px));
    const modeSel = byId('layoutSel', HTMLSelectElement),
      zoomSel = byId('deskZoom', HTMLSelectElement);
    modeSel.onchange = () => {
      this.settings = { ...this.settings, mode: toLayoutMode(modeSel.value) };
      this.apply();
    };
    zoomSel.onchange = () => {
      this.settings = { ...this.settings, zoom: zoomSel.value };
      this.fit();
      host.resize();
      this.save();
    };
  }

  get mode(): LayoutSettings['mode'] {
    return this.settings.mode;
  }

  /** The grip's share of the window height; undefined = adaptive. The grip refits and saves itself. */
  get maSize(): number | undefined {
    return this.settings.maSize;
  }
  set maSize(size: number | undefined) {
    this.settings = { ...this.settings, maSize: size };
  }

  /** Boot: reads the saved layout, shows it in the selects and applies it. */
  restore(): void {
    this.settings = loadLayout();
    byId('layoutSel', HTMLSelectElement).value = this.settings.mode;
    byId('deskZoom', HTMLSelectElement).value = this.settings.zoom;
    this.apply();
  }

  apply(): void {
    const { host } = this,
      body = document.body,
      wasMa = body.classList.contains('ma'),
      ma = this.settings.mode === 'ma';
    this.parts.restore();
    body.classList.toggle('desk', this.settings.mode === 'desk');
    body.classList.toggle('ma', ma);
    if (ma) {
      this.parts.toMa(() => host.keypad());
      if (host.sideTabs.current === 'pools') {
        host.sideTabs.show('sheet');
        this.forcedTab = 'sheet';
      }
    } else if (this.settings.mode === 'desk') this.parts.toDesk(() => host.keypad());
    else this.parts.toClassic(() => host.removeKeypad());
    if (!ma && this.forcedTab) {
      if (host.sideTabs.current === this.forcedTab) host.sideTabs.show('pools');
      this.forcedTab = null;
    }
    this.deskFit.invalidate();
    host.renderEncoders();
    this.fit();
    host.resize();
    if (host.currentView() === 'foh' && wasMa !== ma) host.setView('foh', true);
    this.save();
  }

  /** Refits the console to the window (window resize, grip drag, zoom change). */
  fit(): void {
    this.deskFit.fit(this.settings);
  }

  save(): void {
    saveLayout(this.settings);
  }
}
