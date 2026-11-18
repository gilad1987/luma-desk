import { describe, expect, it } from 'vitest';
import { typeGuessWarnings } from '../../../src/mvr/import/typeGuessWarnings.ts';

describe('typeGuessWarnings', () => {
  it('gives one warning per guessed desk type, with the fixture count', () => {
    const counts = new Map([
      ['spot', 12],
      ['strobe', 1],
    ] as const);
    expect(typeGuessWarnings(counts)).toEqual([
      {
        code: 'type-from-name',
        message: '12 fixture(s) have a GDTF that does not tell their kind; they are shown as "Spot" from their name.',
        ref: 'spot',
      },
      {
        code: 'type-from-name',
        message: '1 fixture(s) have a GDTF that does not tell their kind; they are shown as "Strobe" from their name.',
        ref: 'strobe',
      },
    ]);
  });

  it('gives no warning when no type is a guess', () => {
    expect(typeGuessWarnings(new Map())).toEqual([]);
  });
});
