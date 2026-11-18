/**
 * QA of mvrFileName edges mvrFileName.test.ts leaves out: an empty or dot-only name, a reserved device name that
 * appears only after trimming, and a cut at 200 bytes that lands in a surrogate pair after 1- and 2-byte characters.
 * The bug it guards: a download name the file system refuses, or a half character that shows as U+FFFD.
 */
import { describe, expect, it } from 'vitest';
import { mvrFileName } from '../../../../../src/ui/panels/mvr/mvrFileName.ts';

const bytes = (text: string): number => new TextEncoder().encode(text).length;

describe('mvrFileName edges', () => {
  it('gives the default name for an empty, dot-only or blank name', () => {
    expect(['', '.', ' . ', '\t\n'].map(mvrFileName)).toEqual(Array(4).fill('luma-desk.mvr'));
  });

  it('prefixes a reserved name that shows only after trimming or before an extension', () => {
    expect(['  con ', 'con.txt', 'Com9.', 'LPT1 . '].map(mvrFileName)).toEqual([
      '_con.mvr',
      '_con.txt.mvr',
      '_Com9.mvr',
      '_LPT1.mvr',
    ]);
  });

  it('never keeps half of a surrogate pair at the 200-byte cut, after Hebrew and ASCII', () => {
    const name = mvrFileName(`a${'ש'.repeat(97)}${'🎭'.repeat(5)}`);
    expect([name, bytes(name)]).toEqual([`a${'ש'.repeat(97)}🎭.mvr`, 1 + 194 + 4 + 4]);
    expect(new TextDecoder().decode(new TextEncoder().encode(name))).toBe(name);
  });
});
