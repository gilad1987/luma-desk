import { setVenue } from '../../domain/stage/edit/deckOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { createTemplate, TEMPLATE_IDS, type TemplateId } from '../../domain/stage/templates';
import { VENUE_KINDS } from '../../domain/stage/types';
import { requireChild } from '../dom';
import { templateCardsMarkup, venueCardsMarkup } from './startMarkup';

/** What the start screen starts from and where its choice goes. */
export interface StartScreenDeps {
  /**
   * The app's factory design, the object itself: choosing "Current Sultan's Pool rig" must keep its identity, so a
   * commit of it leaves the show without a `stage` key. `createTemplate('sultans-pool')` would be an equal copy.
   */
  readonly builtIn: StageDesign;
  /** Receives the chosen template with the chosen venue set. */
  readonly choose: (design: StageDesign) => void;
}

/**
 * The two-step start of a builder visit: a template card, then a venue card (plan §2: templates, then venue). The
 * venue step has a Back button, so a wrong template pick does not force a Cancel of the whole visit.
 */
export class StartScreen {
  readonly #root: HTMLElement;
  readonly #deps: StartScreenDeps;

  constructor(root: HTMLElement, deps: StartScreenDeps) {
    this.#root = root;
    this.#deps = deps;
  }

  /** Shows step 1, the template cards. */
  show(): void {
    this.#root.innerHTML = templateCardsMarkup;
    for (const id of TEMPLATE_IDS) {
      requireChild(this.#root, `[data-template="${id}"]`).onclick = () => this.#pickTemplate(id);
    }
  }

  #pickTemplate(id: TemplateId): void {
    const design = id === 'sultans-pool' ? this.#deps.builtIn : createTemplate(id);
    this.#root.innerHTML = venueCardsMarkup;
    requireChild(this.#root, '[data-start="back"]').onclick = () => this.show();
    for (const kind of VENUE_KINDS) {
      requireChild(this.#root, `[data-venue="${kind}"]`).onclick = () => this.#deps.choose(setVenue(design, kind));
    }
  }
}
