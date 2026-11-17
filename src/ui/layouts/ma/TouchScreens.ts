import { cssRgb } from '../../../core';
import type { Fixture } from '../../../domain/Fixture';
import { byId } from '../../dom';
import { colorMarker } from './colorMarker';
import type { MaReadoutSource } from './MaReadoutSource';

/**
 * The read-outs of the MA deck: the colour and position touch screens and the level value under the wheel. It does
 * not own the pads themselves (ColorPad, FocusPad); it only asks FocusPad to redraw when the selection changes.
 */
export class TouchScreens {
  /** The selection the position pad was last drawn for, so it redraws only on a change. */
  private drawnFor: string | null = null;

  readonly #source: MaReadoutSource;
  readonly #redrawFocus: () => void;

  constructor(source: MaReadoutSource, redrawFocus: () => void) {
    this.#source = source;
    this.#redrawFocus = redrawFocus;
  }

  update(): void {
    const ids = this.#source.selectedIds(),
      fixtures = ids.map((id) => this.#source.fixture(id));
    this.paintColor(fixtures, ids.length);
    const key = ids.join();
    if (key !== this.drawnFor) {
      this.drawnFor = key;
      this.#redrawFocus();
    }
    this.paintPosition(fixtures, ids.length);
    const dimmer = fixtures.find((f) => f.has('dim'));
    byId('lvlVal').textContent = dimmer ? String(Math.round(this.#source.value(dimmer, 'dim'))) : '—';
  }

  private paintColor(fixtures: readonly Fixture[], selected: number): void {
    const f = fixtures.find((x) => x.has('r')),
      marker = byId('tsColMk'),
      none = byId('tsColNone');
    if (f) {
      const r = this.#source.value(f, 'r'),
        g = this.#source.value(f, 'g'),
        b = this.#source.value(f, 'b');
      const at = colorMarker(r, g, b);
      Object.assign(marker.style, {
        display: 'block',
        left: at.left + '%',
        top: at.top + '%',
        background: cssRgb(r, g, b),
      });
      byId('tsColInfo').textContent = `R${Math.round(r)} G${Math.round(g)} B${Math.round(b)}`;
    } else {
      marker.style.display = 'none';
      byId('tsColInfo').textContent = '';
    }
    none.style.display = f ? 'none' : '';
    none.textContent = selected ? 'NO COLOR IN SELECTION' : 'NO SELECTION · PICKS GO TO LIT FIXTURES';
  }

  private paintPosition(fixtures: readonly Fixture[], selected: number): void {
    const f = fixtures.find((x) => x.has('pan'));
    byId('tsPosInfo').textContent = f
      ? `PAN ${Math.round(this.#source.value(f, 'pan'))}° TILT ${Math.round(this.#source.value(f, 'tilt'))}°`
      : '';
    byId('tsPosNone').style.display = selected ? 'none' : '';
  }
}
