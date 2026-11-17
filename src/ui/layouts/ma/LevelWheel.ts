import type { AttrName } from '../../../domain/attributes';
import { byId } from '../../dom';
import { boxMap, type BoxMap } from '../../shared';

/** Wheel travel in px for a full 0–100 dimmer sweep. */
const PX_PER_SWEEP = 320;
/** Travel of one mouse-wheel notch in px. */
const NOTCH_PX = 3.2;
/** Shift gives fine adjustment at a tenth of the speed. */
const FINE = 0.1;

/**
 * The MA level wheel: dragging or scrolling it changes the dimmer of the selection through the encoder path, and the
 * wheel texture scrolls with it. It holds no level itself.
 */
export class LevelWheel {
  private travel = 0;
  private lastY = 0;
  private map: BoxMap | null = null;

  /** `delta` is `EncodersPanel.delta`: it applies a dimmer change in percent points to the selection. */
  constructor(private readonly delta: (attr: AttrName, d: number) => void) {
    const wheel = byId('lvlWheel');
    wheel.onpointerdown = (ev) => {
      wheel.setPointerCapture(ev.pointerId);
      this.map = boxMap(wheel);
      this.lastY = this.map(ev)[1] * this.map.h;
      ev.preventDefault();
    };
    wheel.onpointermove = (ev) => {
      if (!wheel.hasPointerCapture(ev.pointerId) || !this.map) return;
      const y = this.map(ev)[1] * this.map.h,
        dy = this.lastY - y;
      this.lastY = y;
      this.turn(wheel, dy, ev.shiftKey);
    };
    wheel.onwheel = (ev) => {
      ev.preventDefault();
      this.turn(wheel, -Math.sign(ev.deltaY) * NOTCH_PX, ev.shiftKey);
    };
  }

  private turn(wheel: HTMLElement, d: number, fine: boolean): void {
    this.travel -= d;
    wheel.style.backgroundPositionY = this.travel + 'px';
    this.delta('dim', ((d * 100) / PX_PER_SWEEP) * (fine ? FINE : 1));
  }
}
