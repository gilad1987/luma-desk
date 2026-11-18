import { Color, Source, Texture, type Material } from 'three';

/** Fields that name or track a material or texture but do not change how it draws. */
const IGNORED_FIELDS = new Set(['uuid', 'name', 'userData', 'version', '_listeners']);

/**
 * A field value as signature data: a colour by its hex code, an image by its instance, a texture by its own
 * signature. Not a texture by its image alone: GLTFLoader clones a texture per sampler, transform or UV channel, so
 * two clones share an image but draw differently. Equal clones of one image (`SharedTextureLoader`) draw alike.
 */
function signatureValue(value: unknown): unknown {
  if (value instanceof Texture) return signatureOf(value);
  if (value instanceof Source) return value.uuid;
  if (value instanceof Color) return value.getHexString();
  return value;
}

/**
 * Every field that changes how `object`, a material or texture, draws (its type, colours, opacity, side, maps, image,
 * sampler and the rest), as text. Two materials with one signature draw alike, whichever file or loader made them.
 */
function signatureOf(object: Material | Texture): string {
  const fields = Object.entries(object).filter(([key]) => !IGNORED_FIELDS.has(key));
  return JSON.stringify(fields.map(([key, value]) => [key, signatureValue(value)]));
}

/**
 * One material instance per look, across all mesh files of an import. Each loader call makes new materials, so 300
 * props that share a grey would otherwise get 300 materials; merging and instancing key on the material instance,
 * and pooled materials let them group those props into one draw call. The pool owns the materials and their maps.
 */
export class MaterialPool {
  readonly #bySignature = new Map<string, Material>();

  /** The pooled material that draws like `material`, which is `material` itself when it is the first of its look. */
  adopt(material: Material): Material {
    const signature = signatureOf(material);
    const pooled = this.#bySignature.get(signature);
    if (!pooled) {
      this.#bySignature.set(signature, material);
      return material;
    }
    if (pooled !== material) material.dispose();
    return pooled;
  }

  /** Frees every pooled material and every texture it holds: `Material.dispose` alone leaves the maps on the GPU. */
  dispose(): void {
    for (const material of this.#bySignature.values()) {
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    }
    this.#bySignature.clear();
  }
}
