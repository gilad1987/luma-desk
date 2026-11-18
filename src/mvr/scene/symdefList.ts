import type { MvrWarning } from '../MvrWarning';
import { childElements, descendantElements } from '../xml/elements';

/**
 * The `<Symdef>`s of `Scene > AUXData`. MVR 1.6, Table 10 (Symdef Childlist Node Children) lists two nodes:
 * `Geometry3D`, "The geometry of this definition that will be instanced in the scene", and `Symbol`, "The symbol
 * instance that will provide a geometry of this definition." A `<Fixture>` is not in that table, and the import takes
 * fixtures from the layers only, so a fixture in a Symdef is not on the desk. One warning for the whole file says
 * how many there are, so the user does not look for them in vain.
 */
export function symdefsOf(auxData: Element | undefined, warnings: MvrWarning[]): readonly Element[] {
  const symdefs = auxData ? childElements(auxData, 'Symdef') : [];
  const count = symdefs.reduce((sum, symdef) => sum + descendantElements(symdef, 'Fixture').length, 0);
  if (count > 0) {
    const [what, them] = count === 1 ? ['1 Fixture is', 'it'] : [`${count} Fixtures are`, 'them'];
    const message = `${what} inside a Symdef, where MVR allows only Geometry3D and Symbol; the desk does not import ${them}.`;
    warnings.push({ code: 'symdef-fixture', message });
  }
  return symdefs;
}
