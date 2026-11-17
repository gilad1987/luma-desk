/** One file the build ships, by its path from the dist root (forward slashes) and its bytes. */
export interface ShippedFile {
  readonly name: string;
  readonly content: string | Uint8Array;
}
