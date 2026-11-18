import { addRiser, removeRiser } from '../../domain/stage/edit/deckOps';
import type { StageDesign, StageRiser } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { he } from '../../i18n/he';
import type { RunEdit } from './ErrorText';
import { makeButton, makeHeading } from './formControls';

/** A new riser in metres: 2 x 2 m, 0.4 m high, the size of a standard stage platform. */
const RISER_SIZE_M: Vec3 = [2, 0.4, 2];

/**
 * The Risers section of the Stage tab: one row per riser with its Remove button, then Add riser. A new riser stands
 * on the deck centre; the top view (W4c) is where it is placed.
 */
export function riserControls(d: StageDesign, run: RunEdit): HTMLElement[] {
  const rows = d.risers.map((riser) => riserRow(riser, run));
  const add = makeButton('Add riser', he.builder.tools.addRiser, () =>
    run((draft) => addRiser(draft, deckCentreTop(draft), RISER_SIZE_M)),
  );
  return [makeHeading('Risers'), ...rows, add];
}

function riserRow(riser: StageRiser, run: RunEdit): HTMLElement {
  const row = document.createElement('div');
  row.className = 'item-row';
  const name = document.createElement('span');
  name.textContent = `${riser.id}: ${riser.size[0]} x ${riser.size[2]} m`;
  row.appendChild(name);
  row.appendChild(makeButton('Remove', he.builder.tools.removeRiser, () => run((d) => removeRiser(d, riser.id))));
  return row;
}

/** The centre of the new riser's top face: on the deck centre, one riser height above the deck. */
function deckCentreTop({ deck }: StageDesign): Vec3 {
  return [(deck.x0 + deck.x1) / 2, deck.height + RISER_SIZE_M[1], (deck.z0 + deck.z1) / 2];
}
