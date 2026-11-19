import { MeshStandardMaterial, type Material } from 'three';
import type { MeshPlacement } from '../../mvr/index';
import { wordClass } from './classWords';

/**
 * The material classes of imported scenery: brushed aluminium (`truss`), dark steel (`scaffold`), satin black `deck`,
 * rough black `cloth`, matte `wall`, black `speaker`, a light neutral matte `figure` for people and mannequins, and
 * `default`. `file` means the mesh's own material values win.
 */
export type SceneryClass = 'truss' | 'scaffold' | 'deck' | 'cloth' | 'wall' | 'speaker' | 'figure' | 'default';

/** What a placement says about itself: the owning element's tag, its name, its layer's name and its class's name. */
export type PlacementEvidence = Pick<MeshPlacement, 'kind' | 'name' | 'layerName' | 'className'>;

/** MVR element tags that say what the object is, whatever its name. */
const KIND_CLASSES: ReadonlyMap<string, SceneryClass> = new Map([
  ['truss', 'truss'],
  ['support', 'truss'],
]);

/**
 * Whether `material` carries physically based values a writer chose, so they beat a guess from names. glTF loaders
 * default to roughness 1 and metalness 1 and exporters write metalness 1 blindly, and three's default is roughness 1
 * and metalness 0, so only a standard material with both values below 1 counts. A 3DS (Phong) material never does.
 */
export function hasFileLook(material: Material): boolean {
  return material instanceof MeshStandardMaterial && material.roughness < 1 && material.metalness < 1;
}

/**
 * The material class of one placement of a mesh whose (untextured) material is `material`, decided from data in this
 * order:
 * 1. The MVR element tag: `Truss` and `Support` are aluminium truss; a tag that names a speaker (Vectorworks speaker
 *    elements) is a black speaker.
 * 2. The mesh's own material, when `hasFileLook`: `file`, so its base colour, roughness and metalness stay.
 * 3. Words in the object's name, then in the name of its MVR class (`Classing`), then in its layer's name, in
 *    English or Hebrew (`wordClass`). The object's own name comes first: a class sorts by trade ("LED", "Video"),
 *    and a truss the designer put in such a class is still a truss.
 * 4. `default`, a neutral matte.
 *
 * It cannot tell a black-painted truss from a silver one (the file colour's lightness does that, see `classMaterial`),
 * a named object whose words are in another language, a CAD layer named by number, or a `SceneObject` with no name:
 * those fall to `default`. A file whose PBR values are wrong but below 1 is believed.
 */
export function materialClass(evidence: PlacementEvidence, material: Material): SceneryClass | 'file' {
  const kind = evidence.kind.toLowerCase();
  const byKind = KIND_CLASSES.get(kind) ?? (kind.includes('speaker') ? 'speaker' : undefined);
  if (byKind) return byKind;
  if (hasFileLook(material)) return 'file';
  const byName = wordClass(evidence.name) ?? wordClass(evidence.className ?? '');
  return byName ?? wordClass(evidence.layerName) ?? 'default';
}
