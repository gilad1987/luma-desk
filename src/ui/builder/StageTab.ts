import { setDeckSize, type DeckSize } from '../../domain/stage/edit/deckOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import { ErrorText, type RunEdit } from './ErrorText';
import { makeHeading } from './formControls';
import { numberField } from './numberField';
import { riserControls } from './riserControls';
import { MIN_SIZE_M, SIZE_STEP_M } from './sizeLimits';
import { venueControls } from './venueControls';
import { wallControls } from './wallControls';

const DECK_MAX_M = 100;
const HEIGHT_STEP_M = 0.1;

const DECK_FIELDS: readonly { key: keyof DeckSize; label: string; title: string; step: number }[] = [
  { key: 'width', label: 'Deck width (m)', title: he.builder.tools.deckWidth, step: SIZE_STEP_M },
  { key: 'depth', label: 'Deck depth (m)', title: he.builder.tools.deckDepth, step: SIZE_STEP_M },
  { key: 'height', label: 'Deck height (m)', title: he.builder.tools.deckHeight, step: HEIGHT_STEP_M },
];

/**
 * The Stage tab: deck size, LED wall, risers, venue and scenery. It re-renders from the draft after every session
 * change and edits only through the session, so undo and the live preview see every change.
 */
export class StageTab {
  readonly root: HTMLElement = document.createElement('div');
  readonly #session: EditorSession;

  constructor(session: EditorSession) {
    this.#session = session;
    this.render();
  }

  /** Rebuilds the tab from the current draft. */
  render(): void {
    const d = this.#session.draft;
    const error = new ErrorText();
    const run: RunEdit = (op) => error.show(this.#session.edit(op));
    this.root.replaceChildren(
      makeHeading('Deck'),
      ...this.#deckFields(d),
      ...wallControls(d, this.#session, run),
      ...riserControls(d, this.#session, run),
      ...venueControls(d, run),
      error.root,
    );
  }

  #deckFields(d: StageDesign): HTMLElement[] {
    const size = deckSizeOf(d);
    return DECK_FIELDS.map(({ key, label, title, step }) =>
      numberField({
        label,
        title,
        step,
        value: size[key],
        min: MIN_SIZE_M,
        max: DECK_MAX_M,
        send: (value) => this.#session.edit((draft) => setDeckSize(draft, { ...deckSizeOf(draft), [key]: value })),
      }),
    );
  }
}

function deckSizeOf({ deck }: StageDesign): DeckSize {
  return { width: deck.x1 - deck.x0, depth: deck.z1 - deck.z0, height: deck.height };
}
