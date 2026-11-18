/**
 * Owns the download name of an export: `<show name>.mvr` that Windows, macOS and Linux all accept, with Hebrew kept.
 * The bugs it guards: a name the file system refuses or renames, and a long name cut in the middle of a character.
 */
import { describe, expect, it } from 'vitest';
import { mvrFileName } from '../../../../src/ui/panels/mvr/mvrFileName';

const bytes = (text: string): number => new TextEncoder().encode(text).length;

describe('mvrFileName', () => {
  it('keeps Hebrew, trims and replaces characters a file system refuses', () => {
    expect(mvrFileName('הופעה')).toBe('הופעה.mvr');
    expect(mvrFileName(' a/b:c ')).toBe('a_b_c.mvr');
    expect(mvrFileName('  ')).toBe('luma-desk.mvr');
  });

  it('replaces control characters', () => {
    expect(mvrFileName('a\u0000b\tc\u007fd\u0085e')).toBe('a_b_c_d_e.mvr');
  });

  it('drops trailing dots and spaces, so no name ends like "show..mvr" or "show .mvr"', () => {
    expect(mvrFileName('show. .')).toBe('show.mvr');
    expect(mvrFileName('...')).toBe('luma-desk.mvr');
  });

  it('avoids the Windows reserved device names in any case', () => {
    const names = ['CON', 'prn', 'Aux', 'NUL', 'COM1', 'lpt9', 'nul.backup'].map(mvrFileName);
    expect(names).toEqual(['_CON', '_prn', '_Aux', '_NUL', '_COM1', '_lpt9', '_nul.backup'].map((n) => `${n}.mvr`));
    expect(mvrFileName('CONSOLE')).toBe('CONSOLE.mvr');
  });

  it('also avoids COM0, LPT0, the superscript ports, CONIN$, CONOUT$ and a reserved name before " ."', () => {
    const names = ['COM0', 'lpt0', 'COM¹', 'LPT²', 'com³', 'CONIN$', 'conout$', 'CON .txt', 'nul  .x'].map(mvrFileName);
    const prefixed = ['COM0', 'lpt0', 'COM¹', 'LPT²', 'com³', 'CONIN$', 'conout$', 'CON .txt', 'nul  .x'];
    expect(names).toEqual(prefixed.map((name) => `_${name}.mvr`));
    expect(mvrFileName('COM10')).toBe('COM10.mvr');
  });

  it('replaces lone surrogates and prefixes a name that would start with a dot', () => {
    expect(mvrFileName('a\uD800b\uDC00c')).toBe('a_b_c.mvr');
    expect(mvrFileName(' .hidden')).toBe('_.hidden.mvr');
  });

  it('never cuts inside a grapheme: a combining mark, Hebrew niqqud or a ZWJ emoji stays whole', () => {
    expect(mvrFileName(`${'a'.repeat(199)}e\u0301`)).toBe(`${'a'.repeat(199)}.mvr`);
    expect(mvrFileName(`${'a'.repeat(196)}שָׁ`)).toBe(`${'a'.repeat(196)}.mvr`);
    expect(mvrFileName(`${'a'.repeat(190)}👨‍👩‍👧`)).toBe(`${'a'.repeat(190)}.mvr`);
    expect(mvrFileName(`${'a'.repeat(182)}👨‍👩‍👧`)).toBe(`${'a'.repeat(182)}👨‍👩‍👧.mvr`);
  });

  it('cuts a long name to 200 UTF-8 bytes before ".mvr" without cutting a character in half', () => {
    expect(mvrFileName('a'.repeat(300))).toBe(`${'a'.repeat(200)}.mvr`);
    expect(mvrFileName('ש'.repeat(150))).toBe(`${'ש'.repeat(100)}.mvr`);
    const emoji = mvrFileName(`a${'😀'.repeat(60)}`);
    expect([emoji, bytes(emoji)]).toEqual([`a${'😀'.repeat(49)}.mvr`, 197 + 4]);
    expect(mvrFileName(`${'a'.repeat(199)} b`)).toBe(`${'a'.repeat(199)}.mvr`);
  });
});
