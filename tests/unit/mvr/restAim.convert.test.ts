/**
 * The file's physical pan and tilt become desk values that draw the beam where the GDTF angles put it by the
 * right-hand rule (pan about GDTF +Z, tilt about GDTF +X, rest beam -Z): docs/mvr-fixture-frames.md. The expected
 * beam is turned here with three.js axis rotations, not with the formula under test.
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { dirFrom } from '../../../src/domain/aim.ts';
import { deskAimOf, fileAngle } from '../../../src/domain/stage/mvrRestAim.ts';

const D2R = Math.PI / 180;
const TURNED_OVER = new Quaternion(1, 0, 0, 0);
const QUARTER = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 90 * D2R);
const TIPPED = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 1).normalize(), 70 * D2R);

/** The beam of GDTF angles in the desk frame of the body: GDTF `(x, y, z)` is desk `(x, z, -y)`. */
function gdtfBeam(pan: number, tilt: number): Vector3 {
  const beam = new Vector3(0, 0, -1)
    .applyAxisAngle(new Vector3(1, 0, 0), tilt * D2R)
    .applyAxisAngle(new Vector3(0, 0, 1), pan * D2R);
  return new Vector3(beam.x, beam.z, -beam.y);
}

const ANGLES = [
  [0, 0],
  [45, 30],
  [-120, 60],
  [200, -45],
  [10, -90],
  [300, 20],
  [-400, 135],
] as const;
const BODIES = [
  ['hanging at rest', { mount: 'hang' as const }, new Quaternion()],
  ['turned over', { mount: 'floor' as const, rotation: TURNED_OVER }, TURNED_OVER],
  ['turned a quarter', { mount: 'hang' as const, rotation: QUARTER }, QUARTER],
  ['tipped', { mount: 'hang' as const, rotation: TIPPED }, TIPPED],
  ['in the desk floor pose', { mount: 'floor' as const }, TURNED_OVER],
] as const;
const CASES = BODIES.flatMap(([name, body, turn]) =>
  ANGLES.map(([pan, tilt]) => [name, pan, tilt, { body, turn }] as const),
);

describe('deskAimOf', () => {
  it.each(CASES)('draws the GDTF beam of a body %s at pan %d, tilt %d', (_name, pan, tilt, { body, turn }) => {
    const aim = deskAimOf(pan, tilt, !('rotation' in body) && body.mount === 'floor');
    const drawn = dirFrom(body, aim.pan, aim.tilt, new Vector3());
    expect(drawn.distanceTo(gdtfBeam(pan, tilt).applyQuaternion(turn))).toBeLessThan(1e-3);
    expect(Math.abs(aim.pan)).toBeLessThanOrEqual(270);
  });

  it('wraps pan by whole turns and stops a tilt the desk cannot reach at its limit', () => {
    expect(deskAimOf(300, 0, false)).toEqual({ pan: -60, tilt: 0 });
    expect(deskAimOf(0, 150, false)).toEqual({ pan: 0, tilt: -135 });
  });
});

describe('fileAngle', () => {
  const range = { from: -270, to: 270 };

  it('takes the last command of the axis, in degrees', () => {
    expect(fileAngle(['Body_Pan,f 10', 'Yoke_Tilt,f 5', 'Body_Pan,f 20'], 'pan', {})).toBe(20);
    expect(fileAngle(['Body_Pan,f 10', 'Body_Zoom,f 5', 'garbage'], 'tilt', {})).toBeUndefined();
  });

  it('reads the percent form only with the range of the axis', () => {
    expect(fileAngle(['/1/Base_Pan.Pan.Pan/percent ,f 75'], 'pan', { range })).toBe(135);
    expect(fileAngle(['/1/Base_Pan.Pan.Pan/percent ,f 75'], 'pan', {})).toBeUndefined();
  });

  it('reads a share of a range that runs from high to low', () => {
    expect(fileAngle(['/1/Base_Pan.Pan.Pan/percent ,f 75'], 'pan', { range: { from: 270, to: -270 } })).toBe(-135);
  });
});
