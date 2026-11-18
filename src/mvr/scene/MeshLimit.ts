import type { MvrWarning } from '../MvrWarning';

/**
 * One running budget for the meshes an import builds. Nested Symbols multiply (5 levels of 10 Symbols already give
 * 100 000 meshes), and a chain of Symdefs that each hold the next copies a memoised list once per level, so a file of
 * a few kilobytes could ask for billions of meshes and exhaust the page's memory. Every `LocalMesh` the
 * `SymbolExpander` builds (memoised Symdef lists included) counts once against the same budget; a scene
 * `MeshPlacement` is made from one of them and is not counted again. The reference plots build under
 * 20 000, so 250 000 only stops a runaway file. The warning is raised once per import.
 */
export class MeshLimit {
  /** The most mesh objects one import builds. */
  static readonly MAX = 250_000;
  private readonly warnings: MvrWarning[];
  private used = 0;
  private warned = false;

  /** Reports the first refusal into the import's `warnings`. */
  constructor(warnings: MvrWarning[]) {
    this.warnings = warnings;
  }

  /** Counts one more mesh; `false` once the budget is spent, and the first `false` adds a `too-many-meshes` warning. */
  take(): boolean {
    if (this.used < MeshLimit.MAX) {
      this.used += 1;
      return true;
    }
    if (!this.warned) {
      this.warned = true;
      const message = `The file asks for more than ${MeshLimit.MAX} meshes; the rest are left out.`;
      this.warnings.push({ code: 'too-many-meshes', message });
    }
    return false;
  }
}
