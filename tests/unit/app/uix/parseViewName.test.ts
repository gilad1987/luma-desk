import { describe, expect, it } from 'vitest';
import { parseViewName } from '../../../../src/app/uix/parseViewName';
import { VIEWS } from '../../../../src/render/camera/viewTable';

describe('parseViewName', () => {
  it('accepts every key of the view table, the MA eye included', () => {
    const names = Object.keys(VIEWS);
    expect(names.map(parseViewName)).toEqual(names);
    expect(parseViewName('fohMa')).toBe('fohMa');
  });

  it('rejects a missing name, an unknown name and an inherited key', () => {
    expect([parseViewName(undefined), parseViewName('nope'), parseViewName('toString'), parseViewName('')]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
