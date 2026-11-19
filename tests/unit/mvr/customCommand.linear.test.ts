/**
 * `parseCustomCommand` reads the text in linear time: it splits at the last comma and matches a fixed tail, so a
 * long run of spaces no longer makes the regular expression try every split. The results for valid text are the same.
 */
import { describe, expect, it } from 'vitest';
import { parseCustomCommand } from '../../../src/domain/stage/mvrCommand.ts';

const SPACES = ' '.repeat(100_000);

describe('parseCustomCommand edge texts', () => {
  it.each([
    ['Body_Pan,f 50', { name: 'Body_Pan', value: 50, percent: false }],
    ['  /7/Body_Pan/percent , f  20  ', { name: 'Body_Pan', value: 20, percent: true }],
    ['a,b,f 5', { name: 'a,b', value: 5, percent: false }],
    ['Body_Pan\n,f 5', { name: 'Body_Pan', value: 5, percent: false }],
    ['Body_Pan,f\n5', { name: 'Body_Pan', value: 5, percent: false }],
  ])('reads %j', (text, command) => {
    expect(parseCustomCommand(text)).toEqual(command);
  });

  it.each([['Body_Pan,f 1,2'], ['Body_Pan,f'], ['Body_Pan f 5'], [',f 5'], ['Body\nPan,f 5'], ['Body_Pan,f 5 6']])(
    'does not read %j',
    (text) => {
      expect(parseCustomCommand(text)).toBeUndefined();
    },
  );

  it('reads a name with a run of 100000 spaces between two commas', () => {
    expect(parseCustomCommand(`a,${SPACES}x,f 5`)).toEqual({ name: `a,${SPACES}x`, value: 5, percent: false });
  });

  it('does not read a text of 100000 spaces without a comma', () => {
    expect(parseCustomCommand(`a${SPACES}b`)).toBeUndefined();
  });
});
