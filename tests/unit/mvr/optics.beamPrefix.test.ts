// @vitest-environment jsdom
/**
 * The beam reader matches elements by their local name, as the other GDTF readers do: a file that writes its
 * geometry tree with a namespace prefix (`g:Beam`, `g:GeometryReference`) shows the same beams.
 */
import { describe, expect, it } from 'vitest';
import { readBeams } from '../../../src/mvr/gdtf/optics/readBeams.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

describe('readBeams with prefixed tags', () => {
  it('counts a prefixed beam once per prefixed reference', () => {
    const geometries = parseXml(
      '<g:Geometries xmlns:g="urn:example">' +
        '<g:Geometry Name="Body"><g:GeometryReference Name="P1" Geometry="Pixel"/>' +
        '<g:GeometryReference Name="P2" Geometry="Pixel"/></g:Geometry>' +
        '<g:Geometry Name="Pixel"><g:Beam Name="LED" BeamAngle="30"/></g:Geometry></g:Geometries>',
    ).documentElement;
    expect(readBeams(geometries).map(({ root, count }) => [root, count])).toEqual([
      ['Body', 2],
      ['Pixel', 1],
    ]);
  });
});
