// @vitest-environment jsdom
/**
 * `GeometryReference` in the GDTF geometry tree: each reference is expanded to the geometry it names, and a broken
 * file (a missing link, a loop, references that multiply) gives a cut tree, never a hang. All products are invented.
 */
import { describe, expect, it } from 'vitest';
import type { GdtfNode } from '../../../src/mvr/gdtf/GdtfBody.ts';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { gdtfMode, makeGdtf } from '../../shared/index.ts';

const model = (name: string): string => `<Model Name="${name}" Length="0.1" Width="0.1" Height="0.02"/>`;
const rootOf = (geometries: string, top: string, models = ''): GdtfNode | undefined => {
  const modes = gdtfMode('Std', [['Dimmer', 'Offset="1"']], top);
  return readGdtf(makeGdtf({ models, geometries, modes }), 'Bar.gdtf').info?.bodies[0]?.root;
};
const countParts = (node: GdtfNode): number => 1 + node.children.reduce((sum, child) => sum + countParts(child), 0);
const anyPart = (node: GdtfNode, test: (part: GdtfNode) => boolean): boolean =>
  test(node) || node.children.some((child) => anyPart(child, test));

const CELL = '<Beam Name="Cell" Model="Cell" BeamAngle="40"><Geometry Name="Rim" Model="Rim"/></Beam>';
const BAR =
  '<Geometry Name="Bar">' +
  '<GeometryReference Name="P1" Geometry="Cell" Position="{1,0,0,-0.2}{0,1,0,0}{0,0,1,0}{0,0,0,1}">' +
  '<Break DMXOffset="1"/></GeometryReference>' +
  '<GeometryReference Name="P2" Geometry="Cell" Model="Lens"/>' +
  '<GeometryReference Name="P3" Geometry="Nowhere"/></Geometry>';

describe('GeometryReference in the GDTF geometry tree', () => {
  it('expands a reference: its own name and position, the children and beam of the geometry it names', () => {
    const [p1, p2] = rootOf(BAR + CELL, 'Bar', model('Cell') + model('Rim') + model('Lens'))?.children ?? [];
    expect([p1?.name, p1?.type, p1?.target, p1?.position[12]]).toEqual(['P1', 'GeometryReference', 'Cell', -0.2]);
    expect(p1?.model?.name).toBe('Cell');
    expect(p1?.beam).toMatchObject({ beamType: 'Wash', beamAngle: 40, fieldAngle: 25, beamRadius: 0.05 });
    // the Break is patch data of the reference, not a part; the part under it comes from the named geometry
    expect(p1?.children.map((part) => [part.name, part.model?.name])).toEqual([['Rim', 'Rim']]);
    // GDTF: a reference's own model replaces the model of the named geometry only, not of its children
    expect([p2?.model?.name, p2?.children[0]?.model?.name]).toEqual(['Lens', 'Rim']);
  });

  it('keeps a reference to a geometry the file does not have, marked as missing', () => {
    const root = rootOf(BAR + CELL, 'Bar');
    expect(root?.children[2]).toMatchObject({ name: 'P3', target: 'Nowhere', broken: 'missing', children: [] });
    expect(readGdtf(makeGdtf({ geometries: BAR + CELL }), 'Bar.gdtf').info?.bodies).toEqual([]);
  });

  it('cuts a reference loop where it closes', () => {
    const loop =
      '<Geometry Name="A"><GeometryReference Name="ToB" Geometry="B"/></Geometry>' +
      '<Geometry Name="B"><GeometryReference Name="ToA" Geometry="A"/></Geometry>';
    const toB = rootOf(loop, 'A')?.children[0];
    expect([toB?.name, toB?.broken, toB?.children.length]).toEqual(['ToB', undefined, 1]);
    expect(toB?.children[0]).toMatchObject({ name: 'ToA', target: 'A', broken: 'loop', children: [] });
    const self = rootOf('<Geometry Name="A"><GeometryReference Name="Me" Geometry="A"/></Geometry>', 'A');
    expect(self?.children[0]?.broken).toBe('loop');
  });

  it('stops references that multiply before the tree grows without bound', () => {
    const ten = (target: string): string =>
      Array.from({ length: 10 }, (_, i) => `<GeometryReference Name="R${i}" Geometry="${target}"/>`).join('');
    // six levels of ten references each name 111 111 parts
    const levels = Array.from(
      { length: 6 },
      (_, i) => `<Geometry Name="T${i}">${i < 5 ? ten(`T${i + 1}`) : ''}</Geometry>`,
    );
    const root = rootOf(levels.join(''), 'T0');
    expect(root && countParts(root)).toBeLessThan(21000);
    expect(root && anyPart(root, (part) => part.broken === 'limit')).toBe(true);
  });
});
