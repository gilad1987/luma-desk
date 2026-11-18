/**
 * The `<CustomCommand>` grammar. MVR 1.6 example: `Body_Pan,f 50`. GDTF, Channel Function:
 * `"/FIXTURE_ID/CUSTOM_NAME_CHANNELFUCTION ,f FLOAT_VALUE_PHYSICAL"` and the `/percent` form with
 * `FLOAT_VALUE_PERCENT`; the default custom name is the node name, for example `Head_Dimmer.Dimmer.Dimmer`.
 */
import { describe, expect, it } from 'vitest';
import { commandAxis, parseCustomCommand } from '../../../src/domain/stage/mvrCommand.ts';

describe('parseCustomCommand', () => {
  it.each([
    ['Body_Pan,f 50', { name: 'Body_Pan', value: 50, percent: false }],
    ['Yoke_Tilt,f -12.5', { name: 'Yoke_Tilt', value: -12.5, percent: false }],
    [
      '/101/Head_Dimmer.Dimmer.Dimmer ,f 3.9265e+2',
      { name: 'Head_Dimmer.Dimmer.Dimmer', value: 392.65, percent: false },
    ],
    ['/101/Head_Tilt.Tilt.Tilt/percent ,f 25', { name: 'Head_Tilt.Tilt.Tilt', value: 25, percent: true }],
    ['  Body_Pan , f   0  ', { name: 'Body_Pan', value: 0, percent: false }],
    ['percent,f 1', { name: 'percent', value: 1, percent: false }],
  ])('reads %s', (text, command) => {
    expect(parseCustomCommand(text)).toEqual(command);
  });

  it.each([
    '',
    'Body_Pan',
    'Body_Pan,f',
    'Body_Pan,f abc',
    'Body_Pan,f NaN',
    'Body_Pan,f 1e999',
    ',f 1',
    'Body_Pan,i 5',
  ])('reads no command from "%s"', (text) => {
    expect(parseCustomCommand(text)).toBeUndefined();
  });
});

describe('commandAxis', () => {
  it.each([
    ['Body_Pan', 'pan'],
    ['Yoke_Tilt', 'tilt'],
    ['Moving_Head_Base_Pan', 'pan'],
    ['Head_Tilt.Tilt.Tilt', 'tilt'],
    ['Base_Pan.Pan.Pan 1', 'pan'],
    ['Pan', 'pan'],
    ['Head_PanRotate', undefined],
    ['Body_Zoom', undefined],
    ['Head_Tilt.TiltRotate.Spin', undefined],
    ['MyPan', undefined],
  ])('names the axis of %s', (name, axis) => {
    expect(commandAxis({ name, value: 0, percent: false })).toBe(axis);
  });
});
