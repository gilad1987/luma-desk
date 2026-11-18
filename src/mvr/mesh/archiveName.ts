/**
 * The archive file a glTF URI names. glTF URIs are percent-encoded, and a malformed escape is read as written. A
 * leading `./` names the folder of the mesh, which the archive keeps at its root with the meshes. The import looks
 * files up by this name and render keys its shared decodes by it, so `wood.png` and `./wood.png` are one file.
 */
export function archiveName(uri: string): string {
  let name = uri;
  try {
    name = decodeURIComponent(uri);
  } catch {
    // A malformed escape: keep the URI as written.
  }
  return name.replace(/^\.\//, '');
}
