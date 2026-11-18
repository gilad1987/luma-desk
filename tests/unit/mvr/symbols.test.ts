// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Mat4 } from '../../../src/mvr/math/Mat4.ts';
import type { MvrWarning } from '../../../src/mvr/MvrWarning.ts';
import { BadMatrices } from '../../../src/mvr/scene/BadMatrices.ts';
import { MeshLimit } from '../../../src/mvr/scene/MeshLimit.ts';
import { SymbolExpander } from '../../../src/mvr/scene/symbols.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const move = (x: number, y: number, z: number): string => `<Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},${y},${z}}</Matrix>`;
const mesh = (file: string, inner = ''): string => `<Geometry3D fileName="${file}">${inner}</Geometry3D>`;
const symbol = (symdef: string, inner = ''): string =>
  `<Symbol uuid="i-${symdef}" symdef="${symdef}">${inner}</Symbol>`;
const symdef = (uuid: string, children: string): string =>
  `<Symdef uuid="${uuid}"><ChildList>${children}</ChildList></Symdef>`;
const offset = (m: Mat4): number[] => [m[12] ?? 0, m[13] ?? 0, m[14] ?? 0];

/** An expander over `auxData` and the `<Geometries>` to expand, both parsed from inline XML. */
function setUp(
  auxData: string,
  geometries: string,
): { expander: SymbolExpander; root: Element; warnings: MvrWarning[] } {
  const doc = parseXml(`<Test><AUXData>${auxData}</AUXData><Geometries>${geometries}</Geometries></Test>`);
  const [aux, root] = Array.from(doc.documentElement.children);
  if (!aux || !root) throw new Error('test XML is incomplete');
  const warnings: MvrWarning[] = [];
  return {
    expander: new SymbolExpander(aux, warnings, new MeshLimit(warnings), new BadMatrices(warnings)),
    root,
    warnings,
  };
}

describe('SymbolExpander', () => {
  it('expands nested symbols to depth 2 and composes symbol, Symdef and mesh matrices', () => {
    const aux = symdef('A', mesh('a.glb') + symbol('B', move(100, 0, 0))) + symdef('B', mesh('b.glb', move(0, 10, 0)));
    const { expander, root, warnings } = setUp(aux, symbol('A', move(0, 0, 1000)) + mesh('own', move(5, 0, 0)));
    const meshes = expander.meshesOf(root);
    expect(meshes.map((m) => [m.file, offset(m.matrix)])).toEqual([
      ['a.glb', [0, 0, 1000]],
      ['b.glb', [100, 10, 1000]],
      ['own', [5, 0, 0]],
    ]);
    expect(warnings).toEqual([]);
  });

  it('expands each Symdef once and reuses it for later instances', () => {
    const { expander, root } = setUp(symdef('A', mesh('a.glb')), symbol('A') + symbol('A', move(1, 0, 0)));
    expect(expander.meshesOf(root)).toHaveLength(2);
    root.ownerDocument.querySelector('Symdef ChildList')?.replaceChildren();
    expect(expander.meshesOf(root).map((m) => m.file)).toEqual(['a.glb', 'a.glb']);
  });

  it('cuts a cycle with one symbol-cycle warning and keeps the meshes before it', () => {
    const aux = symdef('A', mesh('a.glb') + symbol('B')) + symdef('B', mesh('b.glb') + symbol('A'));
    const { expander, root, warnings } = setUp(aux, symbol('A'));
    expect(expander.meshesOf(root).map((m) => m.file)).toEqual(['a.glb', 'b.glb']);
    expect(warnings.map((w) => [w.code, w.ref])).toEqual([['symbol-cycle', 'A']]);
  });

  it('warns missing-symdef once per uuid and gives no meshes', () => {
    const { expander, root, warnings } = setUp('', symbol('nope') + symbol('nope'));
    expect(expander.meshesOf(root)).toEqual([]);
    expect(warnings.map((w) => [w.code, w.ref])).toEqual([['missing-symdef', 'nope']]);
  });

  it('stops below 16 nested levels with a symbol-depth warning', () => {
    const chain = Array.from({ length: 18 }, (_, i) => symdef(`S${i}`, mesh(`m${i}`) + symbol(`S${i + 1}`))).join('');
    const { expander, root, warnings } = setUp(chain, symbol('S0'));
    expect(expander.meshesOf(root)).toHaveLength(16);
    expect(warnings.map((w) => [w.code, w.ref])).toEqual([['symbol-depth', 'S16']]);
  });
});
