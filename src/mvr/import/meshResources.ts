import type { MvrArchive } from '../archive/MvrArchive';
import { glbModel } from '../mesh/glbModel';
import { meshFormatOf } from '../mesh/meshFormatOf';
import type { MvrWarning } from '../MvrWarning';

/** The URIs a GLB file names outside itself; none when it is not GLB 2.0 or its JSON is broken (bounds warned). */
function externalUris(bytes: Uint8Array): readonly string[] {
  try {
    return glbModel(bytes)?.externalUris ?? [];
  } catch {
    return [];
  }
}

/**
 * The archive file a URI names: glTF URIs are percent-encoded, and a malformed escape is read as written. A leading
 * `./` names the folder of the mesh, which the archive keeps at its root with the meshes.
 */
function archiveName(uri: string): string {
  let name = uri;
  try {
    name = decodeURIComponent(uri);
  } catch {
    // A malformed escape: keep the URI as written.
  }
  return name.replace(/^\.\//, '');
}

/**
 * The files the GLB meshes name by URI (images, external buffers) that the archive holds, keyed by the URI as the
 * glTF writes it: that is the URL GLTFLoader asks render for, so render needs no URI rules of its own. Exporters
 * such as Vectorworks keep a shared texture once at the archive root beside the meshes. A URI the archive lacks
 * warns once per mesh file: without it a texture does not draw, and a mesh without its buffer cannot be parsed.
 */
export function meshResources(
  archive: MvrArchive,
  meshes: ReadonlyMap<string, Uint8Array>,
  warn: (warning: MvrWarning) => void,
): ReadonlyMap<string, Uint8Array> {
  const resources = new Map<string, Uint8Array>();
  for (const [file, bytes] of meshes) {
    if (meshFormatOf(file) !== 'glb') continue;
    for (const uri of externalUris(bytes)) {
      const resource = archive.file(archiveName(uri));
      if (resource) resources.set(uri, resource);
      else
        warn({
          code: 'missing-mesh-resource',
          message: `The mesh file ${file} needs ${uri}, which is not in the archive.`,
          ref: file,
        });
    }
  }
  return resources;
}
