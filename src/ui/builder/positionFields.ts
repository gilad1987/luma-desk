import type { Vec3 } from '../../domain/stage/types';
import { he } from '../../i18n/he';
import { numberField } from './numberField';

const POSITION_LIMIT_M = 100;
const POSITION_STEP_M = 0.1;

/** An axis index into a `Vec3`: 0 is x (side to side), 1 is y (height), 2 is z (upstage to downstage). */
export type Axis = 0 | 1 | 2;

const AXES = [
  { index: 0, label: 'X (m)', title: he.builder.props.x },
  { index: 1, label: 'Y (m)', title: he.builder.props.y },
  { index: 2, label: 'Z (m)', title: he.builder.props.z },
] as const;

/** Where a position field sends a typed value: its delta from the shown position, in metres. */
export type SendPosition = (delta: Vec3) => string | null;

/**
 * One number field per axis in `axes` for an item at `position`: fixtures, trusses and risers place the same way.
 * A field sends a delta on its own axis only (the other two are exactly 0) to the item's move op (`moveFixtures`,
 * `moveTruss`, `moveRiser`), which stores the result rounded to 1 mm, so a typed value is stored as typed.
 * `keyPrefix` tells the fields of one item from another's in the same panel (risers), so the focus comes back to the
 * field the user typed in.
 */
export function positionFields(
  position: Vec3,
  send: SendPosition,
  axes: readonly Axis[] = [0, 1, 2],
  keyPrefix = '',
): HTMLElement[] {
  return AXES.filter(({ index }) => axes.includes(index)).map(({ index, label, title }) =>
    numberField({
      label,
      key: `${keyPrefix}${label}`,
      title,
      value: position[index],
      step: POSITION_STEP_M,
      min: -POSITION_LIMIT_M,
      max: POSITION_LIMIT_M,
      send: (value) => send(alongAxis(index, value - position[index])),
    }),
  );
}

function alongAxis(index: Axis, distance: number): Vec3 {
  const delta: [number, number, number] = [0, 0, 0];
  delta[index] = distance;
  return delta;
}
