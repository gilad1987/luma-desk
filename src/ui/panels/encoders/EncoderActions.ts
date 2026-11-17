import { clamp, lerp } from '../../../core';
import { ATTR, type Feature } from '../../../domain/attributes';
import { toastSelectFirst } from '../../../engine/programmerActions/toastSelectFirst';
import type { EncodersDeps } from './EncodersDeps';
import { PHASER_PARAMS, isPhaserParam, type EncoderAttr } from './encoderSpec';

type ActionDeps = Pick<EncodersDeps, 'bus' | 'state' | 'programmer' | 'selection' | 'rig'>;

/** Colour encoders may run without a selection: they then select the colour targets first. */
const COLOR_ATTRS: readonly EncoderAttr[] = ['r', 'g', 'b'];

/**
 * What encoders and the extras buttons do to the selection. FAN spreads a relative turn from -1x to +1x across the
 * selection order; phaser parameters change every phaser on the selection.
 */
export class EncoderActions {
  readonly #deps: ActionDeps;

  constructor(deps: ActionDeps) {
    this.#deps = deps;
  }

  /** Turns `attr` by `d` on the selection (the knob, the wheel, and the MA level wheel). */
  delta(attr: EncoderAttr, d: number): void {
    const { bus, state, programmer, selection, rig } = this.#deps;
    if (!selection.ids.length && COLOR_ATTRS.includes(attr)) {
      const ids = programmer.colorTargets();
      if (!ids.length) return;
      selection.set(ids);
    }
    if (!selection.ids.length) {
      toastSelectFirst(bus);
      return;
    }
    if (isPhaserParam(attr)) {
      const phasers = programmer.phasersOnSelection();
      if (!phasers.length) {
        bus.emit('message', { kind: 'toast', text: 'No phaser on selection' });
        return;
      }
      const { min, max } = PHASER_PARAMS[attr];
      for (const p of phasers) p[attr] = clamp(p[attr] + d, min, max);
      return;
    }
    const n = selection.ids.length;
    selection.ids.forEach((id, k) => {
      const f = rig.get(id);
      if (!f?.has(attr)) return;
      const cur = programmer.vals[id]?.[attr] ?? f.base[attr] ?? ATTR[attr].def;
      const m = state.fanMode && n > 1 ? lerp(-1, 1, k / (n - 1)) : 1;
      programmer.set(id, attr, cur + d * m);
    });
  }

  /** Sets `attr` to `v` on the selection (typed values and the quick buttons). */
  abs(attr: EncoderAttr, v: number): void {
    const { programmer, selection } = this.#deps;
    if (isPhaserParam(attr)) {
      const { min, max } = PHASER_PARAMS[attr];
      for (const p of programmer.phasersOnSelection()) p[attr] = clamp(v, min, max);
      return;
    }
    selection.ids.forEach((id) => programmer.set(id, attr, v));
  }

  /** Removes one feature of the selection from the programmer and logs it. */
  knockout(feat: Feature): void {
    const { bus, programmer, selection } = this.#deps;
    programmer.removeFeature(selection.ids, feat);
    bus.emit('message', { kind: 'log', text: `Knockout ${feat} from selection`, level: '' });
  }
}
