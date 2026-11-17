import type { MvrWarning } from '../MvrWarning';

/** The one `bad-matrix` warning of an import, naming the first bad element and how many there are. */
function badMatrix(count: number, first: string): MvrWarning {
  const what = count > 1 ? `${count} elements have a <Matrix>` : 'An element has a <Matrix>';
  const message = `${what} that does not parse, first ${first}; they sit at their parent's origin.`;
  return { code: 'bad-matrix', message, ref: first };
}

/**
 * The bad-matrix count of one import. A writer bug repeats on every object, and one line per object floods the
 * summary, so the import keeps one `bad-matrix` warning that names the first bad element and counts the rest. One
 * object per import, made by the walk and passed down like `MeshLimit`, keeps the count with the import it belongs to.
 */
export class BadMatrices {
  private readonly warnings: MvrWarning[];
  private count = 0;
  private first = '';
  private slot = -1;

  /** Writes the one warning into the import's `warnings`. */
  constructor(warnings: MvrWarning[]) {
    this.warnings = warnings;
  }

  /** Counts one more malformed `<Matrix>` at `ref`; the first adds the warning, later ones update its count. */
  add(ref: string): void {
    this.count += 1;
    if (this.slot < 0) {
      this.first = ref;
      this.slot = this.warnings.length;
    }
    this.warnings[this.slot] = badMatrix(this.count, this.first);
  }
}
