import type { DeskLayout } from '../../show';
import { byId } from '../dom';
import { maZoom, zoomFactor, type MaGeometry } from './fitMath';
import { measureMaGeometry } from './measureMaGeometry';

/**
 * Scales the consoles to the window through CSS variables (`--dz`, `--mz/--mt/--mb`, `--ch/--cw`). The MA console
 * height goes to the renderer through `setConsoleHeight` (decision 18), which shifts the camera view above it.
 */
export class DeskFit {
  /** Measured once per layout; it does not depend on the window size. */
  private geo: MaGeometry | null = null;

  private readonly setConsoleHeight: (px: number) => void;

  constructor(setConsoleHeight: (px: number) => void) {
    this.setConsoleHeight = setConsoleHeight;
  }

  /** Forgets the measured MA console, so the next fit measures it again (after a layout change). */
  invalidate(): void {
    this.geo = null;
  }

  /**
   * Fits for the layout as saved and selected: the mode name is not narrowed, so an unknown name fits like classic, as
   * before; `maSize` undefined is the adaptive size.
   */
  fit(s: DeskLayout): void {
    byId('cbody').style.setProperty('--dz', zoomFactor(s.deskZoom, innerWidth, 1880, 0.66).toFixed(3));
    const mb = byId('maBody');
    if (s.deskMode !== 'ma') {
      this.setConsoleHeight(0);
      mb.style.setProperty('--mz', zoomFactor(s.deskZoom, innerWidth, 1920, 0.55).toFixed(3));
      return;
    }
    if (!this.geo || !this.geo.W) this.geo = measureMaGeometry(mb);
    const geo = this.geo,
      zm = maZoom(geo, s.maSize, innerWidth, innerHeight);
    mb.style.setProperty('--mt', geo.mt.toFixed(1) + 'px');
    mb.style.setProperty('--mb', geo.mb.toFixed(1) + 'px');
    mb.style.setProperty('--mz', zm.toFixed(3));
    const height = geo.H * zm;
    this.setConsoleHeight(height);
    const c = byId('maConsole').style;
    c.setProperty('--ch', height.toFixed(0) + 'px');
    c.setProperty('--cw', (geo.W * zm).toFixed(0) + 'px');
    byId('viewer').style.setProperty('--ch', height.toFixed(0) + 'px');
  }
}
