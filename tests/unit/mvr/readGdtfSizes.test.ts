// @vitest-environment jsdom
/**
 * The overall size of a fixture from the `Model` dimensions and geometry `Position` matrices of its GDTF
 * `description.xml`, and the rule that says when the desk may draw its body at that size. All products are invented.
 */
import { describe, expect, it } from 'vitest';
import type { GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { gdtfBodySize, isVendorSymbol } from '../../../src/mvr/gdtf/gdtfBodySize.ts';
import { readSizes } from '../../../src/mvr/gdtf/readGdtfSizes.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const model = (name: string, length: number, width: number, height: number): string =>
  `<Model Name="${name}" Length="${length}" Width="${width}" Height="${height}"/>`;
/** A GDTF position matrix that only moves: rows in braces, the translation in the 4th column, metres. */
const at = (x: number, y: number, z: number): string => `{1,0,0,${x}}{0,1,0,${y}}{0,0,1,${z}}{0,0,0,1}`;
const sizesOf = (models: string, geometries: string) => {
  const xml = `<FixtureType><Models>${models}</Models><Geometries>${geometries}</Geometries></FixtureType>`;
  return readSizes(parseXml(xml).documentElement);
};

const MOVER_MODELS = model('Base', 0.25, 0.2, 0.07) + model('Yoke', 0.26, 0.1, 0.22) + model('Head', 0.16, 0.16, 0.2);
const MOVER =
  `<Geometry Name="Base" Model="Base"><Axis Name="Yoke" Model="Yoke" Position="${at(0, 0, -0.07)}">` +
  `<Axis Name="Head" Model="Head" Position="${at(0, 0, -0.19)}"><Beam Name="Lens"/></Axis></Axis></Geometry>`;
const pixel = (x: number): string => `<GeometryReference Name="P" Geometry="Cell" Position="${at(x, 0, -0.14)}"/>`;
const BATTEN = `<Geometry Name="Body" Model="Body">${[-0.375, -0.125, 0.125, 0.375].map(pixel).join('')}</Geometry>`;
const CELL = '<Geometry Name="Cell" Model="Cell"><Beam Name="B"/></Geometry>';

const info = (sizes: GdtfInfo['sizes'], manufacturer = 'Acme'): GdtfInfo => ({
  fileName: `${manufacturer}@Thing.gdtf`,
  name: 'Thing',
  manufacturer,
  modes: [{ name: 'Std', geometry: 'Base', channels: [] }],
  references: [],
  hasBeam: true,
  hasDisplay: false,
  sizes,
  bodies: [],
});
const MOVER_SIZE = [{ geometry: 'Base', size: [0.26, 0.2, 0.36] }] as const;

describe('readSizes', () => {
  it('measures a small mover: base hanging from the origin, yoke and head centred on their own', () => {
    const [tree] = sizesOf(MOVER_MODELS, MOVER);
    expect(tree?.geometry).toBe('Base');
    // widest part on X and Y; on Z from the base plate (0) down to the head bottom (-0.07 - 0.19 - 0.2 / 2)
    [0.26, 0.2, 0.36].forEach((value, axis) => expect(tree?.size[axis]).toBeCloseTo(value, 9));
  });

  it('measures a 1 m batten whose pixels are GeometryReferences, and the pixel template on its own', () => {
    const sizes = sizesOf(model('Body', 1, 0.12, 0.15) + model('Cell', 0.1, 0.1, 0.02), BATTEN + CELL);
    expect(sizes.map((tree) => tree.geometry)).toEqual(['Body', 'Cell']);
    // on Z the body hangs from its origin (0) down to its bottom (-0.15); the cells end there too (-0.14 - 0.02 / 2)
    [1, 0.12, 0.15].forEach((value, axis) => expect(sizes[0]?.size[axis]).toBeCloseTo(value, 9));
  });

  it('turns a part by its matrix and reads a malformed matrix as no offset', () => {
    const turned = '{0,-1,0,0}{1,0,0,0}{0,0,1,0}{0,0,0,1}';
    const [tree] = sizesOf(model('Bar', 1, 0.1, 0.1), `<Geometry Name="Bar" Model="Bar" Position="${turned}"/>`);
    [0.1, 1, 0.1].forEach((value, axis) => expect(tree?.size[axis]).toBeCloseTo(value, 9));
    const [plain] = sizesOf(model('Bar', 1, 0.1, 0.1), '<Geometry Name="Bar" Model="Bar" Position="{1,2}"/>');
    expect(plain?.size).toEqual([1, 0.1, 0.1]);
  });

  it('gives no size for a tree without a sized model and survives a reference loop', () => {
    expect(sizesOf(model('M', 0, 0, 0), '<Geometry Name="A" Model="M"/><Geometry Name="B"/>')).toEqual([]);
    const loop = '<Geometry Name="A" Model="M"><GeometryReference Name="R" Geometry="A"/></Geometry>';
    expect(sizesOf(model('M', 0.3, 0.3, 0.3), loop)).toHaveLength(1);
  });
});

describe('gdtfBodySize', () => {
  it('is the largest dimension of the tree the mode names', () => {
    expect(gdtfBodySize(info(MOVER_SIZE), 'Std')).toBe(0.36);
    expect(gdtfBodySize(info([{ geometry: 'Base', size: [1, 0.12, 0.15] }]), 'Std')).toBe(1);
  });

  it('trusts the geometry of a Custom GDTF, whose type and beam stay untrusted', () => {
    expect(gdtfBodySize(info(MOVER_SIZE, 'Custom'), 'Std')).toBe(0.36);
    expect(isVendorSymbol(info(MOVER_SIZE, 'Custom'), 'Custom@Thing')).toBe(true);
    expect(isVendorSymbol(info(MOVER_SIZE), 'custom@Thing')).toBe(true);
    expect(isVendorSymbol(info(MOVER_SIZE), 'Acme@Thing')).toBe(false);
  });

  it('trusts no size outside 0.05 m to 3 m and none for a tree the file did not size', () => {
    const sized = (largest: number) => info([{ geometry: 'Base', size: [largest, 0.01, 0.01] }]);
    expect(gdtfBodySize(sized(0.04), 'Std')).toBeUndefined();
    expect(gdtfBodySize(sized(3.5), 'Std')).toBeUndefined();
    expect(gdtfBodySize(sized(3), 'Std')).toBe(3);
    expect(gdtfBodySize(info([]), 'Std')).toBeUndefined();
    expect(gdtfBodySize(info([{ geometry: 'Other', size: [1, 1, 1] }]), 'Std')).toBeUndefined();
  });
});
