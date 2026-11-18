/**
 * The slash form of a custom command name. GDTF, Channel Function: "Note that all "." Separators can be replaced
 * with "/"." So `/7/Body_Pan/Pan/Pan 1` is fixture 7 and the name `Body_Pan.Pan.Pan 1`.
 */
import { describe, expect, it } from 'vitest';
import { commandAxis, parseCustomCommand } from '../../../src/domain/stage/mvrCommand.ts';
import { fileAngle } from '../../../src/domain/stage/mvrRestAim.ts';

describe('a custom command name with "/" separators', () => {
  it.each([
    ['/7/Body_Pan/Pan/Pan 1 ,f 10', 'Body_Pan.Pan.Pan 1', false, 'pan'],
    ['/7/Head_Tilt/Tilt/Tilt/percent ,f 10', 'Head_Tilt.Tilt.Tilt', true, 'tilt'],
    ['/7/Head_Tilt.Tilt.Tilt/percent ,f 10', 'Head_Tilt.Tilt.Tilt', true, 'tilt'],
    ['Body_Pan/Pan/Pan,f 10', 'Body_Pan.Pan.Pan', false, 'pan'],
    ['/7/Body_Pan ,f 10', 'Body_Pan', false, 'pan'],
    ['/Body_Pan,f 10', 'Body_Pan', false, 'pan'],
    ['/7/Head_Zoom/Zoom/Zoom ,f 10', 'Head_Zoom.Zoom.Zoom', false, undefined],
    ['/7/Head_Tilt/TiltRotate/Spin ,f 10', 'Head_Tilt.TiltRotate.Spin', false, undefined],
  ])('reads %s', (text, name, percent, axis) => {
    const command = parseCustomCommand(text);
    expect(command).toEqual({ name, value: 10, percent });
    expect(command && commandAxis(command)).toBe(axis);
  });

  it('gives the angle of the axis as the dotted form does', () => {
    expect(fileAngle(['/7/Body_Pan/Pan/Pan 1 ,f 10'], 'pan', {})).toBe(10);
    const range = { from: -100, to: 100 };
    expect(fileAngle(['/7/Head_Tilt/Tilt/Tilt/percent ,f 75'], 'tilt', { range })).toBe(50);
    expect(parseCustomCommand('/7/percent ,f 1')).toEqual({ name: '7', value: 1, percent: true });
  });
});
