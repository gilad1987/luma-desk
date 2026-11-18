import { addPresetTruss, type TrussPreset } from '../../domain/stage/edit/trussOps';
import type { StageDeck } from '../../domain/stage/StageDesign';
import type { StageTruss } from '../../domain/stage/trussTypes';
import type { Vec3 } from '../../domain/stage/types';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import { ErrorText } from './ErrorText';
import { makeButton, makeHeading } from './formControls';
import { renderKeepingFocus } from './keepFocus';
import { trussSizeFields } from './trussSizeFields';

const PRESETS: readonly { preset: TrussPreset; label: string }[] = [
  { preset: 'straight', label: 'Straight' },
  { preset: 'circle', label: 'Circle' },
  { preset: 'goalpost', label: 'Goalpost' },
  { preset: 'tower', label: 'Tower' },
];

/**
 * Where a new preset stands, in metres: hung trusses at hang height, a tower on the ground beside the deck, and a
 * goalpost on the deck top (`'deck'`), because its posts stand on the stage it frames.
 */
const PRESET_HEIGHT_M: Readonly<Record<TrussPreset, number | 'deck'>> = {
  straight: 6,
  circle: 8,
  goalpost: 'deck',
  tower: 0,
};
/** A new tower stands this far outside the stage-left deck edge, so it does not stand on the deck. */
const TOWER_GAP_M = 1;

/**
 * The Trusses tab: preset buttons, the truss list and the sizes of the selected truss. A new truss becomes the
 * selection, so its sizes show at once and the Fixtures tab targets it.
 */
export class TrussTab {
  readonly root: HTMLElement = document.createElement('div');
  readonly #session: EditorSession;

  constructor(session: EditorSession) {
    this.#session = session;
    this.render();
  }

  /** Rebuilds the tab from the current draft and selection. */
  render(): void {
    const d = this.#session.draft;
    const error = new ErrorText();
    const presets = document.createElement('div');
    presets.className = 'item-row';
    for (const { preset, label } of PRESETS) {
      presets.appendChild(makeButton(label, he.builder.tools.preset, () => error.show(this.#addPreset(preset))));
    }
    const selected = d.trusses.find((t) => t.id === this.#session.selection.trusses[0]);
    const sizes = selected ? trussSizeFields(this.#session, selected) : [];
    const list = d.trusses.map((truss) => this.#trussButton(truss, truss === selected));
    const heads = [makeHeading('Add truss'), presets, error.root, makeHeading('Trusses')];
    renderKeepingFocus(this.root, [...heads, ...list, ...sizes]);
  }

  #addPreset(preset: TrussPreset): string | null {
    const refused = this.#session.edit((d) => addPresetTruss(d, preset, presetSpot(d.deck, preset)));
    const added = this.#session.draft.trusses.at(-1);
    if (refused === null && added) this.#session.select({ fixtures: [], trusses: [added.id] });
    return refused;
  }

  #trussButton(truss: StageTruss, isSelected: boolean): HTMLElement {
    const select = (): void => this.#session.select({ fixtures: [], trusses: [truss.id] });
    const button = makeButton(truss.name, he.builder.tools.pickTruss, select);
    button.classList.add('truss-item');
    button.classList.toggle('is-selected', isSelected);
    button.ariaPressed = String(isSelected);
    return button;
  }
}

/** The position of a new preset: centred across the deck depth; see `PRESET_HEIGHT_M` and `TOWER_GAP_M`. */
function presetSpot(deck: StageDeck, preset: TrussPreset): Vec3 {
  const x = preset === 'tower' ? deck.x0 - TOWER_GAP_M : (deck.x0 + deck.x1) / 2;
  const height = PRESET_HEIGHT_M[preset];
  return [x, height === 'deck' ? deck.height : height, (deck.z0 + deck.z1) / 2];
}
