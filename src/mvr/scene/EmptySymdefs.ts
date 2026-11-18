import type { MvrWarning } from '../MvrWarning';
import { childElement } from '../xml/elements';

/** The one `empty-symdef` warning of an import, for `count` objects. */
function emptySymdef(count: number): MvrWarning {
  const what = count === 1 ? '1 object uses' : `${count} objects use`;
  const tail = count === 1 ? 'it is not shown' : 'they are not shown';
  return { code: 'empty-symdef', message: `${what} a symbol that has no geometry in the file; ${tail}.` };
}

/**
 * The objects of one import that use a Symdef without children. CAD writers leave tile grids and seat blocks as empty
 * Symdefs placed hundreds of times, so the import keeps one warning that counts them, as `BadMatrices` does for bad
 * matrices. One object per import, made by the `SymbolExpander`, keeps the count with the import it belongs to.
 */
export class EmptySymdefs {
  private readonly warnings: MvrWarning[];
  private readonly read = new Map<Element, boolean>();
  private count = 0;
  private slot = -1;

  /** Writes the one warning into the import's `warnings`. */
  constructor(warnings: MvrWarning[]) {
    this.warnings = warnings;
  }

  /**
   * Whether `symdef` has no children. Each such call counts one more object; the first adds the warning. A Symdef is
   * read once, as the expander reads each Symdef once and reuses it.
   */
  skips(symdef: Element): boolean {
    let empty = this.read.get(symdef);
    if (empty === undefined) {
      empty = !childElement(symdef, 'ChildList')?.firstElementChild;
      this.read.set(symdef, empty);
    }
    if (!empty) return false;
    this.count += 1;
    if (this.slot < 0) this.slot = this.warnings.length;
    this.warnings[this.slot] = emptySymdef(this.count);
    return true;
  }
}
