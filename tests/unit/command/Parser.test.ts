import { describe, expect, it } from 'vitest';
import { lex } from '../../../src/command/Lexer';
import { Parser } from '../../../src/command/parse/Parser';
import type { Statement } from '../../../src/command/statements';

/** Every statement of `raw`, plus the error text if parsing stopped early, and the final-message flag. */
function parse(raw: string): { statements: Statement[]; error?: string; reportsSelection: boolean } {
  const line = lex(raw);
  if (!line) throw new Error('blank line');
  const parser = new Parser(line);
  const statements: Statement[] = [];
  try {
    for (let s = parser.next(); s; s = parser.next()) statements.push(s);
  } catch (err) {
    return { statements, error: (err as Error).message, reportsSelection: parser.reportsSelection };
  }
  return { statements, reportsSelection: parser.reportsSelection };
}

describe('Lexer', () => {
  it('returns undefined for a blank line', () => expect(lex('   ')).toBeUndefined());

  it('rewrites Go+/Go-, @, + and a spaced or leading minus before splitting', () => {
    expect(lex('Go+ go - 1@50 1+2 -3 4 -5')?.lower).toEqual([
      'goplus',
      'gominus',
      '1',
      'at',
      '50',
      '1',
      '+',
      '2',
      '-',
      '3',
      '4',
      '-',
      '5',
    ]);
  });
});

describe('Parser', () => {
  it('quirk C1: only the first list replaces; later lists add, or subtract after "-"', () => {
    const merges = parse('1 Fixture 2 Thru 4 - 3 + Group 2 All').statements.map((s) => s.kind === 'select' && s.merge);
    expect(merges).toEqual(['replace', 'add', 'sub', 'add', 'add']);
  });

  it('quirk C5: any At/Full/Zero token suppresses the selection message', () => {
    expect(parse('1 Thru 5').reportsSelection).toBe(true);
    expect(parse('+').reportsSelection).toBe(true);
    expect(parse('1 Thru 5 Clear Zero').reportsSelection).toBe(false);
  });

  it('decision 9: statements before a syntax error are returned before the error', () => {
    expect(parse('1 At 50 Fade x')).toMatchObject({
      statements: [{ kind: 'select' }, { kind: 'level', value: 50 }],
      error: 'Expected a number after "fade"',
    });
  });

  it('reads Store suffixes in any order, last one winning, as 0-based executor indexes', () => {
    expect(parse('Store Q 3 Exec 2 Fade 1 Exec 4').statements).toEqual([
      { kind: 'storeCue', cue: 3, fade: 1, exec: 3 },
    ]);
    expect(parse('Store').statements).toEqual([{ kind: 'storeCue', cue: null, fade: undefined, exec: undefined }]);
  });

  it('Label takes the rest of the line in its typed case and strips one pair of quotes', () => {
    expect(parse('Label Q 5 "Big  Look" now"').statements).toEqual([
      { kind: 'label', target: 'cue', num: 5, name: 'Big Look" now' },
    ]);
    expect(parse('Label Foo 5 x').error).toBe('Label Cue|Group|Exec n Name');
    expect(parse('Label').error).toBe('Expected a number after ""');
  });

  it('treats Object.prototype names as unknown keywords, quoting the typed case', () => {
    expect(parse('Constructor').error).toBe('Unknown keyword "Constructor"');
    expect(parse('__proto__ 1').error).toBe('Unknown keyword "__proto__"');
  });

  it('reads a missing preset reference as NaN parts', () => {
    expect(parse('Preset').statements).toEqual([{ kind: 'applyPreset', ref: { type: NaN, slot: NaN } }]);
  });
});
