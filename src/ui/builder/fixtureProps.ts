import { TYPES } from '../../domain/fixtureTypes';
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
 * through the programmer, so it has none) and its role. Every field patches the fixture through `setFixtureProps`.
 */
export function fixtureProps(session: Pick<EditorSession, 'edit'>, fixture: StageFixture): HTMLElement[] {
  const send: SendPatch = (patch) => session.edit((d) => setFixtureProps(d, fixture.id, patch));
  const error = new ErrorText();
  const id = document.createElement('p');
  id.className = 'panel-hint';
  id.textContent = `Fixture ${fixture.id} (${TYPES[fixture.type].name})`;
  const position = AXES.map(({ index, label, title }) =>
    numberField({
      label,
      title,
      value: fixture.position[index],
      step: POSITION_STEP_M,
      min: -POSITION_LIMIT_M,
      max: POSITION_LIMIT_M,
      send: (value) => send({ position: withAxis(fixture.position, index, value) }),
    }),
  );
  const role = makeSelect({
    label: 'Role',
    title: he.builder.tools.role,
    choices: ROLE_CHOICES,
    value: fixture.role,
    onPick: (value) => error.show(send({ role: oneOf(FIXTURE_ROLES, value) })),
  });
  return [id, ...position, ...aimFields(fixture, send), role, error.root];
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

function withAxis(position: Vec3, index: 0 | 1 | 2, value: number): Vec3 {
  const next: [number, number, number] = [...position];
  next[index] = value;
  return next;
}
