/**
 * The format of an archive mesh file by its name: `.glb` is glTF (metres, Y up); `.3ds` or no extension at all is 3DS
 * (millimetres, Z up), because older exporters write 3DS names without one. Any other extension is unknown. The
 * import's bounds and render's loaders both ask here, so they never disagree on what a file is.
 */
export function meshFormatOf(file: string): 'glb' | '3ds' | undefined {
  const name = file.toLowerCase();
  if (name.endsWith('.glb')) return 'glb';
  return !/\.[^.]*$/.test(name) || name.endsWith('.3ds') ? '3ds' : undefined;
}
