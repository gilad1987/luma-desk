import type { Mat4 } from '../math/Mat4';

/** One mesh file in the frame of the element that holds it, before the owner's world matrix is applied. */
export interface LocalMesh {
  /** Root-level archive file name, as written (a name without extension is a 3DS file). */
  readonly file: string;
  /** Mesh to holder: the `<Geometry3D>` matrix, with any `<Symbol>` and Symdef matrices above it applied. */
  readonly matrix: Mat4;
  /** The name of the innermost `<Symdef>` the mesh came from; absent for a `<Geometry3D>` outside any Symdef. */
  readonly symdef?: string;
}
