// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { attr, childElement, childElements, childRawText, childText } from '../../../src/mvr/xml/elements.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const root = parseXml(`
  <Fixture name="Spot 1" uuid="">
    <Matrix>
      {1,0,0}{0,1,0}{0,0,1}{0,0,0}
    </Matrix>
    <Addresses><Address break="0">1.1</Address><Address break="1">2.1</Address></Addresses>
    <x:Matrix xmlns:x="urn:x">second</x:Matrix>
    <ChildList><Matrix>nested</Matrix></ChildList>
  </Fixture>`).documentElement;

describe('childElements', () => {
  it('returns all direct child elements without a tag, and no text nodes', () => {
    expect(childElements(root).map((el) => el.localName)).toEqual(['Matrix', 'Addresses', 'Matrix', 'ChildList']);
  });

  it('matches the tag by local name, so a namespace prefix still matches', () => {
    expect(childElements(root, 'Matrix')).toHaveLength(2);
  });

  it('does not descend into nested elements', () => {
    const addresses = childElement(root, 'Addresses');
    expect(childElements(root, 'Address')).toEqual([]);
    expect(addresses && childElements(addresses, 'Address')).toHaveLength(2);
  });
});

describe('childElement', () => {
  it('returns the first direct child with the tag', () => {
    expect(childElement(root, 'Matrix')?.textContent).toContain('{1,0,0}');
  });

  it('returns undefined when there is none', () => {
    expect(childElement(root, 'Focus')).toBeUndefined();
  });
});

describe('childText', () => {
  it('returns the trimmed text of the first matching child', () => {
    expect(childText(root, 'Matrix')).toBe('{1,0,0}{0,1,0}{0,0,1}{0,0,0}');
  });

  it('returns undefined for a missing child', () => {
    expect(childText(root, 'GDTFSpec')).toBeUndefined();
  });
});

describe('childRawText', () => {
  it('keeps the spaces of the text, because GDTF names must match exactly', () => {
    const fixture = parseXml('<Fixture><GDTFMode>Mode 8 - Pixel RGBW </GDTFMode></Fixture>').documentElement;
    expect([childRawText(fixture, 'GDTFMode'), childRawText(fixture, 'GDTFSpec')]).toEqual([
      'Mode 8 - Pixel RGBW ',
      undefined,
    ]);
  });
});

describe('attr', () => {
  it('returns the value, an empty value as empty, and a missing one as undefined', () => {
    expect(attr(root, 'name')).toBe('Spot 1');
    expect(attr(root, 'uuid')).toBe('');
    expect(attr(root, 'multipatch')).toBeUndefined();
  });
});
