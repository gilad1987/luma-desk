import { addRiser, moveRiser, removeRiser } from '../../domain/stage/edit/deckOps';
import type { StageDesign, StageRiser } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import type { RunEdit } from './ErrorText';
import { makeButton, makeHeading } from './formControls';
import { positionFields, type SendPosition } from './positionFields';

/** A new riser in metres: 2 x 2 m, 0.4 m high, the size of a standard stage platform. */
const RISER_SIZE_M: Vec3 = [2, 0.4, 2];

/**
 * The Risers section of the Stage tab: one row per riser with its Remove button and its X and Z fields, then Add
 * riser. A new riser stands on the deck centre and the X and Z fields place it; it has no Y field, because it stands
 * on the deck. The top view draws risers but does not move them.
 */
export function riserControls(d: StageDesign, session: Pick<EditorSession, 'edit'>, run: RunEdit): HTMLElement[] {
  const rows = d.risers.flatMap((riser) => {
    const move: SendPosition = (delta) => session.edit((draft) => moveRiser(draft, riser.id, delta));
    return [riserRow(riser, run), ...positionFields(riser.at, move, [0, 2], `${riser.id} `)];
  });
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
