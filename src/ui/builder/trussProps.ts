import { moveTruss, setTrussProps, type TrussPatch } from '../../domain/stage/edit/trussOps';
import type { StageTruss } from '../../domain/stage/trussTypes';
import { FIXTURE_ROLES } from '../../domain/stage/types';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import { ErrorText } from './ErrorText';
import { labelled, makeSelect, oneOf, ROLE_CHOICES } from './formControls';
import { positionFields } from './positionFields';

/**
 * The property fields of one truss: its id, name, the default role of fixtures added to it, and its position. A
 * position field moves the truss through `moveTruss`, so the fixtures on it move along. Its
 * sizes are in the Trusses tab only, so one size has one field on the screen.
 */
export function trussProps(session: Pick<EditorSession, 'edit'>, truss: StageTruss): HTMLElement[] {
  const error = new ErrorText();
  const patch = (fields: TrussPatch): void => error.show(session.edit((d) => setTrussProps(d, truss.id, fields)));
  const id = document.createElement('p');
  id.className = 'panel-hint';
  id.textContent = `Truss ${truss.id}`;
  const name = document.createElement('input');
  name.type = 'text';
  name.value = truss.name;
  name.title = he.builder.props.name;
  name.onchange = () => patch({ name: name.value });
  const role = makeSelect({
    label: 'Default role',
    title: he.builder.props.trussRole,
    choices: ROLE_CHOICES,
    value: truss.role,
    onPick: (value) => patch({ role: oneOf(FIXTURE_ROLES, value) }),
  });
  const position = positionFields(truss.transform.position, (delta) =>
    session.edit((d) => moveTruss(d, truss.id, delta)),
  );
  return [id, labelled('Name', name), role, ...position, error.root];
}
