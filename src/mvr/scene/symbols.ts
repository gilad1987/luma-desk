import { multiply } from '../math/Mat4';
import type { MvrWarning, MvrWarningCode } from '../MvrWarning';
import { attr, childElement, childElements } from '../xml/elements';
import type { BadMatrices } from './BadMatrices';
import { EmptySymdefs } from './EmptySymdefs';
import type { LocalMesh } from './LocalMesh';
import { localMatrix } from './localMatrix';
import type { MeshLimit } from './MeshLimit';
import { NO_EXPANSION, type Expansion } from './proxySeed';
import { symdefsOf } from './symdefList';

/** The deepest Symbol-in-Symdef nesting followed: real files nest 2 levels, so 16 only stops a runaway file. */
const MAX_DEPTH = 16;

/**
 * Expands MVR symbols into plain mesh lists. A large plot places the same Symdef thousands of times (5721 Symbol
 * instances of 32 Symdefs in the reference file), so each Symdef is expanded once in its own frame and reused; only
 * the final matrix product is paid per instance. The reuse is keyed by depth too, because a Symdef reached deep in a
 * chain may be cut by the depth limit while the same Symdef placed at the top is whole. Bad references warn once and
 * give no meshes, so one broken symbol never stops the import; every mesh built counts against the `MeshLimit`.
 */
export class SymbolExpander {
  private readonly symdefs = new Map<string, Element>();
  private readonly memo = new Map<string, Expansion>();
  private readonly open = new Set<string>();
  private readonly warned = new Set<string>();
  private readonly warnings: MvrWarning[];
  private readonly limit: MeshLimit;
  private readonly bad: BadMatrices;
  /** The placements of Symdefs without children; the scene walk takes them after each element (`swap`). */
  readonly empty: EmptySymdefs;

  /**
   * Indexes the `<Symdef>`s of `Scene > AUXData` by uuid, and reports problems into the walk's `warnings`. The mesh
   * `limit` and the `bad` matrix count are the import's own, shared with the scene walk, so each counts once.
   */
  constructor(auxData: Element | undefined, warnings: MvrWarning[], limit: MeshLimit, bad: BadMatrices) {
    this.warnings = warnings;
    this.limit = limit;
    this.bad = bad;
    this.empty = new EmptySymdefs(warnings);
    for (const symdef of symdefsOf(auxData, warnings)) this.symdefs.set(attr(symdef, 'uuid') ?? '', symdef);
  }

  /**
   * The meshes of a `<Geometries>` (or a Symdef's `<ChildList>`): each `<Geometry3D>` with its own matrix and each
   * `<Symbol>` expanded. `depth` counts the Symdefs already entered; callers outside this class leave it at 0.
   */
  meshesOf(container: Element, depth = 0): LocalMesh[] {
    const out: LocalMesh[] = [];
    for (const child of childElements(container)) if (!this.addChild(child, depth, out)) break;
    return out;
  }

  /** Appends one child's meshes to `out`; `false` once the import's mesh budget is spent, so the caller stops. */
  private addChild(child: Element, depth: number, out: LocalMesh[]): boolean {
    if (child.localName === 'Symbol') {
      const { meshes, seeds } = this.expand(attr(child, 'symdef') ?? '', depth + 1);
      const local = localMatrix(child, this.bad);
      for (const seed of seeds) if (!this.empty.keep(seed, local)) break;
      for (const mesh of meshes) {
        if (!this.limit.take()) return false;
        out.push({ ...mesh, matrix: multiply(local, mesh.matrix) });
      }
      return true;
    }
    const file = child.localName === 'Geometry3D' ? attr(child, 'fileName') : undefined;
    if (!file) return true;
    if (!this.limit.take()) return false;
    out.push({ file, matrix: localMatrix(child, this.bad) });
    return true;
  }

  /** A Symdef's meshes and proxy seeds in its own frame, memoised per uuid and depth. */
  private expand(uuid: string, depth: number): Expansion {
    const symdef = this.symdefs.get(uuid);
    if (!symdef) return this.skip('missing-symdef', 'A Symbol refers to a Symdef the file does not define.', uuid);
    if (this.open.has(uuid)) return this.skip('symbol-cycle', 'A Symdef contains itself; the loop is cut.', uuid);
    if (depth > MAX_DEPTH) return this.skip('symbol-depth', `Symbols nest deeper than ${MAX_DEPTH} levels.`, uuid);
    const key = `${depth}:${uuid}`;
    const known = this.empty.expansionOf(symdef, uuid) ?? this.memo.get(key);
    if (known) return known;
    this.open.add(uuid);
    const [list, name, outer] = [childElement(symdef, 'ChildList'), attr(symdef, 'name') ?? '', this.empty.enter()];
    const meshes = (list ? this.meshesOf(list, depth) : []).map((mesh) => ({ symdef: name, ...mesh }));
    const expansion = { meshes, seeds: this.empty.leave(outer) };
    this.open.delete(uuid);
    this.memo.set(key, expansion);
    return expansion;
  }

  /** Warns once per cause and Symdef, as a broken Symdef placed 1000 times is one problem, not 1000. */
  private skip(code: MvrWarningCode, message: string, ref: string): Expansion {
    const key = `${code}:${ref}`;
    if (!this.warned.has(key)) this.warnings.push({ code, message, ref });
    this.warned.add(key);
    return NO_EXPANSION;
  }
}
