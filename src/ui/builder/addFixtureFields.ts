import type { FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import type { StageTruss } from '../../domain/stage/trussTypes';
import { FIXTURE_ROLES, type FixtureRole } from '../../domain/stage/types';
import { he } from '../../i18n/he';
import { makeSelect, oneOf, ROLE_CHOICES } from './formControls';
import { numberField } from './numberField';

/** The choices of the Add fixtures form; the fields write them as the user picks. */
export interface AddForm {
  type: FixtureTypeId;
  count: number;
  /** A truss id, `FLOOR`, or null while the user has not picked one (the tab then follows the selection). */
  target: string | null;
  /** Null keeps the role `defaultRole` gives. */
  role: FixtureRole | null;
}

/** The target value of a floor row; truss ids are never empty. */
export const FLOOR = '';

/** Every type the form adds; 'screen' is left out because the LED wall owns its screen fixture. */
const ADDABLE_TYPES: readonly FixtureTypeId[] = [
  'spot',
  'beam',
  'wash',
  'par',
  'blinder',
  'strobe',
  'bar',
  'follow',
  'profile',
];
/** The role value that keeps the default role. */
const AUTO_ROLE = '';
const MAX_COUNT = 500;

/**
 * The four fields of the Add fixtures form: type, count, target and role. `shownTarget` is the target the tab
 * resolved, so the select shows what the Add button will use.
 */
export function addFixtureFields(form: AddForm, shownTarget: string, trusses: readonly StageTruss[]): HTMLElement[] {
  const { tools } = he.builder;
  return [
    makeSelect({
      label: 'Type',
      title: tools.fixtureType,
      choices: ADDABLE_TYPES.map((type) => ({ value: type, text: TYPES[type].name })),
      value: form.type,
      onPick: (value) => (form.type = oneOf(ADDABLE_TYPES, value)),
    }),
    numberField({
      label: 'Count',
      title: tools.count,
      value: form.count,
      step: 1,
      min: 1,
      max: MAX_COUNT,
      send: (count) => {
        form.count = count;
        return null;
      },
    }),
    makeSelect({
      label: 'On',
      title: tools.target,
      choices: [...trusses.map((t) => ({ value: t.id, text: t.name })), { value: FLOOR, text: 'Floor row' }],
      value: shownTarget,
      onPick: (value) => (form.target = value),
    }),
    makeSelect({
      label: 'Role',
      title: tools.role,
      choices: [{ value: AUTO_ROLE, text: 'Auto' }, ...ROLE_CHOICES],
      value: form.role ?? AUTO_ROLE,
      onPick: (value) => (form.role = value === AUTO_ROLE ? null : oneOf(FIXTURE_ROLES, value)),
    }),
  ];
}
