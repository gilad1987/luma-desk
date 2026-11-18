import { TYPES } from '../../domain/fixtureTypes';
import { moveFixtures } from '../../domain/stage/edit/fixtureMoves';
import { setFixtureProps, type FixturePatch } from '../../domain/stage/edit/itemOps';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { FIXTURE_ROLES, type Vec3 } from '../../domain/stage/types';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import { ErrorText } from './ErrorText';
import { makeSelect, oneOf, ROLE_CHOICES } from './formControls';
import { numberField } from './numberField';

const POSITION_LIMIT_M = 100;
const POSITION_STEP_M = 0.1;
const ANGLE_LIMIT_DEG = 360;
const ANGLE_STEP_DEG = 1;

const AXES = [
  { index: 0, label: 'X (m)', title: he.builder.props.x },
  { index: 1, label: 'Y (m)', title: he.builder.props.y },
  { index: 2, label: 'Z (m)', title: he.builder.props.z },
] as const;

type SendPatch = (patch: FixturePatch) => string | null;

/**
 * The property fields of one fixture: its id, position, the fixed pan and tilt of a static type (a moving head aims
 * through the programmer, so it has none) and its role. A position field moves the fixture through `moveFixtures`, the
 * same op as a top view drag, so its pixel line moves with it; the other fields patch it through `setFixtureProps`.
 * The 'screen' fixture of an LED wall has no position or aim fields: the wall places it, and it casts no beam.
 */
export function fixtureProps(session: Pick<EditorSession, 'edit'>, fixture: StageFixture): HTMLElement[] {
  const send: SendPatch = (patch) => session.edit((d) => setFixtureProps(d, fixture.id, patch));
  const error = new ErrorText();
  const id = document.createElement('p');
  id.className = 'panel-hint';
  id.textContent = `Fixture ${fixture.id} (${TYPES[fixture.type].name})`;
  const role = makeSelect({
    label: 'Role',
    title: he.builder.tools.role,
    choices: ROLE_CHOICES,
    value: fixture.role,
    onPick: (value) => error.show(send({ role: oneOf(FIXTURE_ROLES, value) })),
  });
  const placement = fixture.type === 'screen' ? [] : [...positionFields(session, fixture), ...aimFields(fixture, send)];
  return [id, ...placement, role, error.root];
}

function positionFields(session: Pick<EditorSession, 'edit'>, fixture: StageFixture): HTMLElement[] {
  return AXES.map(({ index, label, title }) =>
    numberField({
      label,
      title,
      value: fixture.position[index],
      step: POSITION_STEP_M,
      min: -POSITION_LIMIT_M,
      max: POSITION_LIMIT_M,
      send: (value) =>
        session.edit((d) => moveFixtures(d, [fixture.id], axisDelta(index, value - fixture.position[index]))),
    }),
  );
}

function aimFields(fixture: StageFixture, send: SendPatch): HTMLElement[] {
  if (TYPES[fixture.type].moving) return [];
  const fixed = fixture.fixed ?? { pan: 0, tilt: 0 };
  const angle = { step: ANGLE_STEP_DEG, min: -ANGLE_LIMIT_DEG, max: ANGLE_LIMIT_DEG };
  return [
    numberField({
      ...angle,
      label: 'Pan (°)',
      title: he.builder.props.pan,
      value: fixed.pan,
      send: (pan) => send({ fixed: { ...fixed, pan } }),
    }),
    numberField({
      ...angle,
      label: 'Tilt (°)',
      title: he.builder.props.tilt,
      value: fixed.tilt,
      send: (tilt) => send({ fixed: { ...fixed, tilt } }),
    }),
  ];
}

/** A delta along one axis only, so a field edit never moves the other two axes. */
function axisDelta(index: 0 | 1 | 2, amount: number): Vec3 {
  const delta: [number, number, number] = [0, 0, 0];
  delta[index] = amount;
  return delta;
}
