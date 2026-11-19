import { describe, expect, it } from 'vitest';
import { parseXml } from '../../shared';

// The probe's own XML reader must fail loudly on input it cannot read, so a broken scene never passes as an empty one.
describe('parseXml', () => {
  it('reads elements, quoted attributes, entities and text', () => {
    const doc = parseXml(`<a k="1" q='&lt;x&gt;'><b>&#65;&#x42;&amp;</b><c/></a>`);
    const [a] = doc.children;
    expect(a?.attrs).toEqual({ k: '1', q: '<x>' });
    expect(a?.children.map((c) => [c.tag, c.text])).toEqual([
      ['b', 'AB&'],
      ['c', ''],
    ]);
  });

  it('throws on an unquoted attribute instead of reading the tag as text', () => {
    expect(() => parseXml('<Scene><Fixture uuid=F1 name="x"/></Scene>')).toThrow(/malformed XML tag <Fixture uuid=F1/);
  });

  it('throws on a valueless attribute', () => {
    expect(() => parseXml('<Scene><Layer visible></Layer></Scene>')).toThrow(/malformed XML tag <Layer visible>/);
  });

  it('names a character reference beyond U+10FFFF instead of a bare RangeError', () => {
    expect(() => parseXml('<a>&#x110000;</a>')).toThrow(/&#x110000; is beyond U\+10FFFF/);
    expect(() => parseXml('<a>&#1114112;</a>')).toThrow(/beyond U\+10FFFF/);
    expect(parseXml('<a>&#x10FFFF;</a>').children[0]?.text).toBe(String.fromCodePoint(0x10ffff));
  });

  it('skips a DOCTYPE with an internal subset whole, its ">" characters included', () => {
    const doc = parseXml(
      `<?xml version="1.0"?><!DOCTYPE GeneralSceneDescription [ <!ELEMENT a (b)> <!ENTITY e "x>y"> ]><Root v="2"/>`,
    );
    expect(doc.text).toBe('');
    expect(doc.children.map((c) => [c.tag, c.attrs])).toEqual([['Root', { v: '2' }]]);
  });
});
