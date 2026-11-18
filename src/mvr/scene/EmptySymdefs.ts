import { identity, multiply, type Mat4 } from '../math/Mat4';
import type { MvrWarning } from '../MvrWarning';
import { attr, childElement } from '../xml/elements';
import type { Expansion, ProxySeed } from './proxySeed';

/**
 * The Symdefs of one import that have no children. CAD writers leave tile grids and seat blocks as empty Symdefs
 * placed thousands of times; each placement is kept as a `ProxySeed`, so the import can count every one, draw the
 * kinds it can name and report the rest. One object per import, made by the `SymbolExpander`.
 */
export class EmptySymdefs {
  /**
   * The most seeds one import keeps. Real plots hold a few thousand; nested Symdefs of a hostile file multiply
   * without end, so the cap only stops a runaway file, as `MeshLimit` does for meshes.
   */
  static readonly MAX = 250_000;
  private readonly warnings: MvrWarning[];
  private readonly read = new Map<Element, Expansion | undefined>();
  private kept = 0;
  private sink: ProxySeed[] = [];

  /** Writes the one over-the-cap warning into the import's `warnings`. */
  constructor(warnings: MvrWarning[]) {
    this.warnings = warnings;
  }

  /**
   * The expansion of `symdef` when it has no children: no mesh and one seed at its origin; `undefined` when it has
   * children. A Symdef is read once, as the expander meets the same Symdef for every placement.
   */
  expansionOf(symdef: Element, uuid: string): Expansion | undefined {
    if (!this.read.has(symdef)) {
      const empty = !childElement(symdef, 'ChildList')?.firstElementChild;
      const seed: ProxySeed = { symdef: uuid, symdefName: attr(symdef, 'name') ?? '', matrix: identity() };
      this.read.set(symdef, empty ? { meshes: [], seeds: [seed] } : undefined);
    }
    return this.read.get(symdef);
  }

  /**
   * Replaces the list that `keep` fills and returns the one filled so far. The expander swaps in a fresh list while
   * it reads a Symdef, as seeds met there are in the Symdef's frame and belong to its expansion; the scene walk
   * swaps after each element, as the seeds met for it are in that element's frame.
   */
  swap(next: ProxySeed[]): ProxySeed[] {
    const filled = this.sink;
    this.sink = next;
    return filled;
  }

  /** Keeps `seed`, moved by `local`, in the current list; `false` once the cap is reached, which warns once. */
  keep(seed: ProxySeed, local: Mat4): boolean {
    if (this.kept >= EmptySymdefs.MAX) {
      const message = `The file places more than ${EmptySymdefs.MAX} symbols that have no geometry; the rest are left out.`;
      if (this.kept === EmptySymdefs.MAX) this.warnings.push({ code: 'empty-symdef', message });
      this.kept += 1;
      return false;
    }
    this.kept += 1;
    this.sink.push({ ...seed, matrix: multiply(local, seed.matrix) });
    return true;
  }
}
