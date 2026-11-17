import { FEAT_ATTRS, FEATS } from '../../../domain/attributes';
import type { Programmer } from '../../../engine/Programmer';
import { createElement } from '../../shared';
import type { FeatureTab } from './encoderList';

/** Whether the programmer holds anything of a feature: the dot (`.has`) on its tab. */
function featureHasValues(feat: FeatureTab, programmer: Programmer): boolean {
  if (feat === 'fx') return programmer.fxList.length > 0;
  return Object.values(programmer.vals).some((vals) => FEAT_ATTRS[feat].some((a) => vals[a] != null));
}

/** The feature tab bar (`#featTabs`): one button per feature, the current one lit. */
export class FeatureTabs {
  readonly #host: HTMLElement;
  readonly #pick: (feat: FeatureTab) => void;
  #buttons: (readonly [FeatureTab, HTMLButtonElement])[] = [];

  /** `pick` runs on a tab click with the chosen feature. */
  constructor(host: HTMLElement, pick: (feat: FeatureTab) => void) {
    this.#host = host;
    this.#pick = pick;
  }

  /** Rebuilds the buttons with `current` lit. */
  render(current: FeatureTab): void {
    this.#host.innerHTML = '';
    this.#buttons = FEATS.map(([k, n]) => {
      const b = createElement('button', k === current ? 'on' : '', n);
      b.dataset['f'] = k;
      b.onclick = () => this.#pick(k);
      this.#host.appendChild(b);
      return [k, b] as const;
    });
  }

  /** Marks the tabs whose feature the programmer holds (fast tick). */
  paintDots(programmer: Programmer): void {
    for (const [k, b] of this.#buttons) b.classList.toggle('has', featureHasValues(k, programmer));
  }
}
