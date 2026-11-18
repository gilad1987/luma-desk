/** A mesh file the archive holds but three.js could not parse, with the loader's reason, for the import summary. */
export interface MeshFailure {
  readonly file: string;
  readonly reason: string;
}
