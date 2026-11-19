import { clamp } from '../../core';
import { ATTR } from '../attributes';
import type { PanTilt } from '../Fixture';
import { commandAxis, parseCustomCommand } from './mvrCommand';

/** The physical angles of an axis at DMX 0 (`from`) and at full (`to`), as the GDTF channel function gives them. */
export interface AxisRange {
  readonly from: number;
  readonly to: number;
}

/** What the file says about one axis of a fixture: its GDTF range, when the GDTF is trusted. */
export interface FileAxis {
  readonly range?: AxisRange | undefined;
}

/** Ten turns: the widest physical angle taken from a file when no trusted GDTF range bounds the axis. */
export const MAX_FILE_ANGLE = 3600;

/** The angle of an axis, and whether the file's value was past the range (`capped`) or past any head (`rejected`). */
export interface FileAngle {
  readonly angle?: number | undefined;
  readonly limit?: 'capped' | 'rejected' | undefined;
}

/**
 * The physical angle, in degrees about the GDTF axis, that the commands leave an axis at. Commands run in file order,
 * so the last readable command of the axis holds; text that is no command is skipped and never hides an earlier one.
 * `undefined` when no readable command drives the axis, when the command that holds is the `/percent` form and the
 * range is not known (a share of the function's range needs the range), and when its value is rejected
 * (`readFileAngle`).
 *
 * `<DMXInvertPan>` and `<DMXInvertTilt>` do not change the angle. MVR: "Defines of all Pan Channels of the fixture
 * should be DMX Inverted": the flag is about the DMX value of the channel. A command states the PHYSICAL value
 * (GDTF: "FLOAT_VALUE_PHYSICAL is the physical value that the fixture should adopt"), which is where the head stands
 * whichever DMX value brings it there. The flags stay in the design and in an export (docs/mvr-fixture-frames.md).
 */
export function fileAngle(commands: readonly string[], axis: 'pan' | 'tilt', file: FileAxis): number | undefined {
  return readFileAngle(commands, axis, file).angle;
}

/**
 * `fileAngle` with what the bound did. GDTF: "FLOAT_VALUE_PHYSICAL is the physical value that the fixture should
 * adopt", and a fixture adopts no angle past its `PhysicalFrom`/`PhysicalTo`: with a trusted range the value stops
 * at the nearer end (`capped`). Without one, a value beyond `MAX_FILE_ANGLE` is no angle of a real head and is not
 * used (`rejected`), so no file value reaches the desk unbounded.
 */
export function readFileAngle(commands: readonly string[], axis: 'pan' | 'tilt', file: FileAxis): FileAngle {
  const last = commands
    .map(parseCustomCommand)
    .filter((command) => command !== undefined && commandAxis(command) === axis)
    .pop();
  const { range } = file;
  if (last === undefined || (last.percent && range === undefined)) return {};
  if (range === undefined && Math.abs(last.value) > MAX_FILE_ANGLE) return { limit: 'rejected' };
  if (range === undefined) return { angle: last.value };
  const stated = last.percent ? range.from + (range.to - range.from) * (last.value / 100) : last.value;
  const angle = clamp(stated, Math.min(range.from, range.to), Math.max(range.from, range.to));
  return angle === stated ? { angle } : { angle, limit: 'capped' };
}

/**
 * Turns an angle by whole turns into the range, when a whole turn can bring it there. The turn count is computed,
 * not stepped: a loop that subtracts 360 never ends on a value like 1e300, where `x - 360 === x`.
 */
function wrapInto(angle: number, min: number, max: number): number {
  if (!Number.isFinite(angle)) return angle;
  const down = angle > max ? angle - 360 * Math.ceil((angle - max) / 360) : angle;
  const wrapped = down < min ? down + 360 * Math.ceil((min - down) / 360) : down;
  return wrapped > max ? angle : wrapped;
}

/**
 * The desk pan and tilt that draw the beam where the GDTF physical angles put it by the right-hand rule: pan about
 * GDTF +Z, tilt about GDTF +X, the rest beam along -Z. That beam is `(-sin T sin P, sin T cos P, -cos T)` in the
 * GDTF frame, `(-sin T sin P, -cos T, -sin T cos P)` in the desk frame. `dirFrom` draws
 * `(sin t sin p, -cos t, sin t cos p)`, so desk pan is `P` and desk tilt is `-T`. The desk floor pose (`floorPose`:
 * no `rotation`, floor mount) stands for a body turned over about X and draws `(sin t sin p, cos t, sin t cos p)`,
 * so there desk pan is `180 - P`. Pan wraps by whole turns into the desk range; a tilt past the desk range has no
 * desk value and stops at the limit.
 */
export function deskAimOf(pan: number, tilt: number, floorPose: boolean): PanTilt {
  const deskPan = wrapInto(floorPose ? 180 - pan : pan, ATTR.pan.min, ATTR.pan.max);
  // `+ 0` turns a rounded -0 into 0, so a saved pose reads back as the same value
  return {
    pan: +clamp(deskPan, ATTR.pan.min, ATTR.pan.max).toFixed(2) + 0,
    tilt: +clamp(-tilt, ATTR.tilt.min, ATTR.tilt.max).toFixed(2) + 0,
  };
}
