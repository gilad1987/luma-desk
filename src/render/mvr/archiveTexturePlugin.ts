import type { Texture } from 'three';
import type { GLTFLoaderPlugin, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { OfflineLoadingManager } from './OfflineLoadingManager';

/** The parts of a glTF document that say which image a texture shows. */
interface GltfImageRefs {
  readonly textures?: readonly { readonly source?: number }[];
  readonly images?: readonly { readonly uri?: string }[];
}

/**
 * "No texture" as a plugin result. GLTFLoader takes a texture that resolves to null as no map (GLTFParser
 * `assignTexture`: `if ( ! texture ) return null;`); the three.js types declare only `Promise<Texture>`, so the
 * value is typed to that.
 */
const NO_TEXTURE = Promise.resolve(null) as unknown as Promise<Texture>;

/** The URI of the file that texture `index` shows, when it names one rather than a buffer view. */
function imageUriOf(json: GltfImageRefs, index: number): string | undefined {
  const source = json.textures?.[index]?.source;
  return source === undefined ? undefined : json.images?.[source]?.uri;
}

/**
 * The plugin every GLB parse of an import registers. It has the archive images decoded as the parser decodes embedded
 * ones (`OfflineLoadingManager.decodeLike`), and it answers a texture whose image file the archive lacks with no
 * texture before GLTFLoader requests it. Requested, the file would fail to load and GLTFLoader would log an error per
 * mesh, although the import already warned once that the file is missing; with no map, the part draws in its own
 * material colour, in the night look. GLTFLoader needs a name for every plugin (the types omit it).
 */
export function archiveTexturePlugin(
  parser: GLTFParser,
  manager: OfflineLoadingManager,
): GLTFLoaderPlugin & { readonly name: string } {
  manager.decodeLike(parser.textureLoader);
  const json = parser.json as GltfImageRefs;
  return {
    name: 'luma_archive_textures',
    loadTexture: (index) => {
      const uri = imageUriOf(json, index);
      return uri === undefined || manager.holds(uri) ? null : NO_TEXTURE;
    },
  };
}
