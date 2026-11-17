// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MvrError } from '../../../src/mvr/MvrWarning.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

describe('parseXml', () => {
  it('parses well-formed XML into a document', () => {
    const doc = parseXml('<GeneralSceneDescription verMajor="1"><Scene/></GeneralSceneDescription>');
    expect(doc.documentElement.localName).toBe('GeneralSceneDescription');
    expect(doc.documentElement.getAttribute('verMajor')).toBe('1');
  });

  it('accepts an XML declaration and a namespace prefix', () => {
    const doc = parseXml('<?xml version="1.0" encoding="UTF-8"?><m:Scene xmlns:m="urn:x"><m:Layers/></m:Scene>');
    expect(doc.documentElement.localName).toBe('Scene');
  });

  it('drops trailing NUL bytes, as grandMA3 and Vectorworks sample exports end the scene XML with them', () => {
    const doc = parseXml('<GeneralSceneDescription><Scene/></GeneralSceneDescription>\n\0');
    expect(doc.documentElement.localName).toBe('GeneralSceneDescription');
  });

  it.each([
    ['an unclosed tag', '<Scene><Layers></Scene>'],
    ['text that is not XML', 'not xml'],
    ['an empty string', ''],
    ['two root elements', '<a/><b/>'],
  ])('throws MvrError bad-xml for %s', (_label, text) => {
    expect(() => parseXml(text)).toThrow(MvrError);
    expect(() => parseXml(text)).toThrow(expect.objectContaining({ code: 'bad-xml' }));
  });
});
