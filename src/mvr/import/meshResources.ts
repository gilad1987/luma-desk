import type { MvrArchive } from '../archive/MvrArchive';
import { archiveName } from '../mesh/archiveName';
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

/** One warning per missing URI, not per mesh file: a show often shares one texture across dozens of meshes. */
function missingWarning(uri: string, files: ReadonlySet<string>): MvrWarning {
  const message = `${files.size} mesh file(s) need "${uri}", which is not in the archive.`;
  return { code: 'missing-mesh-resource', message, ref: uri };
}

/**
 * The files the GLB meshes name by URI (images, external buffers) that the archive holds, keyed by the URI as the
 * glTF writes it: that is the URL GLTFLoader asks render for, so render needs no URI rules of its own. Exporters
 * such as Vectorworks keep a shared texture once at the archive root beside the meshes. A URI the archive lacks
 * warns once, with the count of mesh files that need it, in the order the URIs first appear: without it a texture
 * does not draw, and a mesh without its buffer cannot be parsed.
 */
export function meshResources(
  archive: MvrArchive,
  meshes: ReadonlyMap<string, Uint8Array>,
  warn: (warning: MvrWarning) => void,
): ReadonlyMap<string, Uint8Array> {
  const resources = new Map<string, Uint8Array>();
  const missing = new Map<string, Set<string>>();
  for (const [file, bytes] of meshes) {
    if (meshFormatOf(file) !== 'glb') continue;
    for (const uri of externalUris(bytes)) {
      const resource = archive.file(archiveName(uri));
      if (resource) resources.set(uri, resource);
      else missing.set(uri, (missing.get(uri) ?? new Set<string>()).add(file));
    }
  }
  for (const [uri, files] of missing) warn(missingWarning(uri, files));
  return resources;
}
