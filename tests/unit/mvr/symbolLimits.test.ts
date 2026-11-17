// @vitest-environment jsdom
/**
 * Limits of `SymbolExpander` against hostile Symdef trees: an exponential fan-out stops when the one mesh budget of
 * `MeshLimit` is spent, with one warning, and a Symdef cut by the depth limit deep in a chain is still whole where it
 * is placed near the top.
 */
import { describe, expect, it } from 'vitest';
import type { MvrWarning } from '../../../src/mvr/MvrWarning.ts';
import { BadMatrices } from '../../../src/mvr/scene/BadMatrices.ts';
import { MeshLimit } from '../../../src/mvr/scene/MeshLimit.ts';
import { SymbolExpander } from '../../../src/mvr/scene/symbols.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const mesh = (file: string): string => `<Geometry3D fileName="${file}"/>`;
const symbol = (symdef: string): string => `<Symbol uuid="i-${symdef}" symdef="${symdef}"/>`;
const symdef = (uuid: string, children: string): string =>
  `<Symdef uuid="${uuid}"><ChildList>${children}</ChildList></Symdef>`;

/** Symdefs `L0`..`L{levels-1}`, each holding `fan` Symbols of the next; the last one holds one mesh. */
function fanOut(levels: number, fan: number): string {
  const level = (i: number): string => (i === levels - 1 ? mesh('m.glb') : symbol(`L${i + 1}`).repeat(fan));
  return Array.from({ length: levels }, (_unused, i) => symdef(`L${i}`, level(i))).join('');
}

/** Expands `geometries` against the Symdefs in `auxData`; returns the mesh files and the warning codes and refs. */
function expand(auxData: string, geometries: string): { files: string[]; warnings: string[][] } {
  const doc = parseXml(`<Test><AUXData>${auxData}</AUXData><Geometries>${geometries}</Geometries></Test>`);
  const [aux, root] = Array.from(doc.documentElement.children);
  if (!aux || !root) throw new Error('test XML is incomplete');
  const warnings: MvrWarning[] = [];
  const expander = new SymbolExpander(aux, warnings, new MeshLimit(warnings), new BadMatrices(warnings));
  const files = expander.meshesOf(root).map((m) => m.file);
  return { files, warnings: warnings.map((w) => [w.code, w.ref ?? '']) };
}

describe('SymbolExpander limits', () => {
  // The memoised levels below L0 take 111 111 meshes and L0 the rest, so the top copy gets none: a runaway file
  // shows its warning and no partial forest, and memory stays bounded.
  it('stops 6 nested levels of 10 Symbols (10^6 meshes) once the mesh budget is spent, with one warning', () => {
    const { files, warnings } = expand(fanOut(7, 10), symbol('L0'));
    expect([files.length < MeshLimit.MAX, warnings]).toEqual([true, [['too-many-meshes', '']]]);
  });

  it('expands 5 nested levels of 10 Symbols (10^5 meshes) in full without a warning', () => {
    const { files, warnings } = expand(fanOut(6, 10), symbol('L0'));
    expect([files.length, warnings]).toEqual([100_000, []]);
  });

  it('keeps a Symdef whole at the top after the depth limit cut it deep in a chain', () => {
    const chain = Array.from({ length: 15 }, (_unused, i) => symdef(`S${i}`, mesh(`m${i}`) + symbol(`S${i + 1}`)));
    const aux = chain.join('') + symdef('S15', mesh('m15') + symbol('X')) + symdef('X', mesh('x'));
    const { files, warnings } = expand(aux, symbol('S0') + symbol('S15'));
    expect(files.slice(14)).toEqual(['m14', 'm15', 'm15', 'x']);
    expect(warnings).toEqual([['symbol-depth', 'X']]);
  });
});
