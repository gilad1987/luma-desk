import { byId } from '../../dom';
import { Encoder } from '../../components/Encoder';
import type { UiPanel } from '../UiPanel';
import { EncoderActions } from './EncoderActions';
import { encoderList, type FeatureTab } from './encoderList';
import { encoderReadout } from './encoderReadout';
import type { EncodersDeps } from './EncodersDeps';
import { encodersMarkup } from './encodersMarkup';
import { encoderSpec, type EncoderAttr } from './encoderSpec';
import { EncoderExtra } from './extra/EncoderExtra';
import { FeatureTabs } from './FeatureTabs';
import { formatEncoderValue } from './formatEncoderValue';

/**
 * The encoder section: feature tabs, the encoder row and the feature's extras. The row is rebuilt on a tab click and
 * by the layout (`render`, because MA pads the row); the readouts repaint on the 50 ms tick. The extras are not
 * rebuilt on selection changes (quirk Q9).
 */
export class EncodersPanel implements UiPanel {
  #feat: FeatureTab = 'dim';
  #encoders: (readonly [EncoderAttr, Encoder])[] = [];
  readonly #deps: EncodersDeps;
  readonly #actions: EncoderActions;
  readonly #tabs: FeatureTabs;
  readonly #row: HTMLElement;
  readonly #extra: EncoderExtra;

  /** Renders `#enc` right after `host` (`#main`) and draws the feature tabs; the layout then calls `render`. */
  constructor(host: HTMLElement, deps: EncodersDeps) {
    this.#deps = deps;
    host.insertAdjacentHTML('afterend', encodersMarkup);
    this.#actions = new EncoderActions(deps);
    this.#row = byId('encoders');
    this.#extra = new EncoderExtra(byId('encExtra'), deps, this.#actions);
    this.#tabs = new FeatureTabs(byId('featTabs'), (feat) => {
      this.#feat = feat;
      this.#tabs.render(feat);
      this.render();
    });
    this.#tabs.render(this.#feat);
  }

  /** Rebuilds the encoder row for the current feature and layout, then the extras. */
  render(): void {
    const { modal } = this.#deps;
    this.#row.innerHTML = '';
    this.#encoders = encoderList(this.#feat, this.#deps.layoutMode()).map((attr) => {
      const spec = encoderSpec(attr);
      const encoder = new Encoder(attr, spec, {
        delta: (d) => this.#actions.delta(attr, d),
        edit: () => modal.number(spec.label, (v) => this.#actions.abs(attr, v)),
      });
      this.#row.appendChild(encoder.element);
      return [attr, encoder] as const;
    });
    this.#extra.render(this.#feat);
  }

  /** Turns `attr` by `d` on the selection: the MA level wheel. */
  delta(attr: EncoderAttr, d: number): void {
    this.#actions.delta(attr, d);
  }

  /** FAN changed from the FAN key: the Position extras relabel their Fan button (quirk Q9). */
  fanToggled(): void {
    if (this.#feat === 'pos') this.#extra.render(this.#feat);
  }

  /** Repaints every knob and readout, and the feature dots (the old `updateEncUI`). */
  fast(): void {
    const { selection, rig, programmer } = this.#deps;
    const selected = selection.ids.flatMap((id) => rig.get(id) ?? []);
    const screenGobo = this.#feat === 'gobo' && selected[0]?.type === 'screen';
    for (const [attr, encoder] of this.#encoders) {
      const r = encoderReadout(attr, selected, programmer);
      const text = formatEncoderValue(attr, r.value, screenGobo);
      encoder.paint(r.value, r.programmed, !r.enabled && selection.ids.length > 0, text);
    }
    this.#tabs.paintDots(programmer);
  }
}
