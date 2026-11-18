// @vitest-environment jsdom
/**
 * A Symdef with no children (a CAD tile grid or a seat block whose geometry the writer left out) gives its objects no
 * meshes; the import says so in one grouped `empty-symdef` warning that counts the objects, not one line per object.
 */
import { describe, expect, it } from 'vitest';
import type { MvrWarning } from '../../../src/mvr/MvrWarning.ts';
import { BadMatrices } from '../../../src/mvr/scene/BadMatrices.ts';
import { MeshLimit } from '../../../src/mvr/scene/MeshLimit.ts';
import { SymbolExpander } from '../../../src/mvr/scene/symbols.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const symbol = (symdef: string, n: number): string => `<Symbol uuid="i-${symdef}-${n}" symdef="${symdef}"/>`;
const AUX =
  '<Symdef uuid="Tiles" name="Tile Grid"><ChildList/></Symdef><Symdef uuid="Seats" name="Seat Block"/>' +
  '<Symdef uuid="Desk" name="Desk"><ChildList><Geometry3D fileName="desk.glb"/></ChildList></Symdef>';

/** The warnings of expanding `geometries` against the Symdefs above. */
function warningsOf(geometries: string): { meshes: number; warnings: MvrWarning[] } {
  const doc = parseXml(`<Test><AUXData>${AUX}</AUXData><Geometries>${geometries}</Geometries></Test>`);
  const [aux, root] = Array.from(doc.documentElement.children);
  if (!aux || !root) throw new Error('test XML is incomplete');
  const warnings: MvrWarning[] = [];
  const expander = new SymbolExpander(aux, warnings, new MeshLimit(warnings), new BadMatrices(warnings));
  return { meshes: expander.meshesOf(root).length, warnings };
}

describe('empty Symdefs', () => {
  it('counts every object that uses one in a single warning', () => {
    const refs = symbol('Tiles', 1) + symbol('Tiles', 2) + symbol('Seats', 1) + symbol('Desk', 1);
    const { meshes, warnings } = warningsOf(refs);
    expect(meshes).toBe(1);
    expect(warnings).toEqual([
      {
        code: 'empty-symdef',
        message: '3 objects use a symbol that has no geometry in the file; they are not shown.',
      },
    ]);
  });

  it('words one object in the singular', () => {
    expect(warningsOf(symbol('Seats', 1)).warnings.map((w) => w.message)).toEqual([
      '1 object uses a symbol that has no geometry in the file; it is not shown.',
    ]);
  });

  it('warns nothing when every symbol has geometry', () => {
    expect(warningsOf(symbol('Desk', 1) + symbol('Desk', 2)).warnings).toEqual([]);
  });
});
