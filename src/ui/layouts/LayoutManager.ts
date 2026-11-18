import type { DeskLayout } from '../../show';
import { byId } from '../dom';
import type { LayoutMode } from '../panels/layoutMode';
import type { SideTab } from '../panels/side/sideTabsMarkup';
import { ConsoleParts } from './ConsoleParts';
import { DeskFit } from './DeskFit';
import { MA_SIZE } from './fitMath';
import type { LayoutHost } from './LayoutHost';
import { toLayoutMode } from './toLayoutMode';

/**
 * Switches between the MA console, the desk console and the classic page by moving panel nodes into console slots,
 * then refits the console and the 3D view. The choice and the grip size persist through the host's `LayoutPrefs`.
 */
export class LayoutManager {
  private settings: DeskLayout = { deskMode: 'ma', deskZoom: 'auto', maSize: undefined };
  /** The tab MA forced onto screen 1 because Pools sits on screen 2; leaving MA gives Pools back. */
  private forcedTab: SideTab | null = null;
  private readonly parts = new ConsoleParts();
  private readonly deskFit: DeskFit;

  readonly #host: LayoutHost;

  constructor(host: LayoutHost) {
    this.#host = host;
    this.deskFit = new DeskFit((px) => host.setConsoleHeight(px));
    const modeSel = byId('layoutSel', HTMLSelectElement),
      zoomSel = byId('deskZoom', HTMLSelectElement);
    modeSel.onchange = () => {
      this.settings = { ...this.settings, deskMode: modeSel.value };
      this.apply();
    };
    zoomSel.onchange = () => {
      this.settings = { ...this.settings, deskZoom: zoomSel.value };
      this.fit();
      host.resize();
      this.save();
    };
    addEventListener('resize', () => {
      if (this.settings.deskMode !== 'classic') this.fit();
    });
  }

  get mode(): LayoutMode {
    return toLayoutMode(this.settings.deskMode);
  }

  /** The grip's share of the window height; undefined = adaptive. The grip refits and saves itself. */
  get maSize(): number | undefined {
    return this.settings.maSize;
  }
  set maSize(size: number | undefined) {
    this.settings = { ...this.settings, maSize: size };
  }

  /** Boot: reads the saved layout (else MA at auto zoom), shows it in the selects and applies it. */
  restore(): void {
    this.settings = this.#host.prefs.load(MA_SIZE) ?? this.settings;
    byId('layoutSel', HTMLSelectElement).value = this.settings.deskMode;
    byId('deskZoom', HTMLSelectElement).value = this.settings.deskZoom;
    this.apply();
  }

  apply(): void {
    const host = this.#host,
      body = document.body,
      wasMa = body.classList.contains('ma'),
      ma = this.settings.deskMode === 'ma';
    this.parts.restore();
    body.classList.toggle('desk', this.settings.deskMode === 'desk');
    body.classList.toggle('ma', ma);
    if (ma) {
      this.parts.toMa(() => host.keypad());
      if (host.sideTabs.current === 'pools') {
        host.sideTabs.show('sheet');
        this.forcedTab = 'sheet';
      }
    } else if (this.settings.deskMode === 'desk') this.parts.toDesk(() => host.keypad());
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
    this.#host.prefs.save(this.settings);
  }
}
