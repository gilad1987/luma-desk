import type { EncoderActions } from '../EncoderActions';
import type { FeatureTab } from '../encoderList';
import type { EncodersDeps } from '../EncodersDeps';
import { beamExtra } from './beamExtra';
import { colorExtra } from './colorExtra';
import { dimExtra } from './dimExtra';
import type { ExtraContext } from './ExtraContext';
import { fxExtra } from './fxExtra';
import { goboExtra } from './goboExtra';
import { positionExtra } from './positionExtra';

const BUILDERS: Readonly<Record<FeatureTab, (host: HTMLElement, ctx: ExtraContext) => void>> = {
  dim: dimExtra,
  pos: positionExtra,
  gobo: goboExtra,
  color: colorExtra,
  beam: beamExtra,
  fx: fxExtra,
};

/** The feature's extras beside the encoders (`#encExtra`): quick buttons, pads, swatches and phaser templates. */
export class EncoderExtra {
  readonly #host: HTMLElement;
  readonly #deps: EncodersDeps;
  readonly #actions: EncoderActions;

  constructor(host: HTMLElement, deps: EncodersDeps, actions: EncoderActions) {
    this.#host = host;
    this.#deps = deps;
    this.#actions = actions;
  }

  /** Rebuilds the extras of `feat` (the old `renderEncExtra`). */
  render(feat: FeatureTab): void {
    this.#host.innerHTML = '';
    const ctx: ExtraContext = { deps: this.#deps, actions: this.#actions, rerender: () => this.render(feat) };
    BUILDERS[feat](this.#host, ctx);
  }
}
