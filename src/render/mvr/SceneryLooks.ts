import type { Material } from 'three';
import { CLASS_KEY } from '../surface/rigKind';
import { classMaterial } from './classLooks';
import { materialClass, type PlacementEvidence } from './materialClass';
import { isTextured } from './sceneryStyle';
import { toneKey, toneOf } from './sceneryTone';

/**
 * The class looks of one import's scenery (`materialClass`, `classMaterial`): one shared material per class, file
 * tone and surface settings, so merging and instancing still group a plot into a few draw calls. A textured part and
 * a part whose file values win (`file`) keep the library's material. A look that reflects mirrors the hall map of the
 * stage, which `hallReflection` owns and hands to it: the looks make no texture, and `dispose` frees the looks alone.
 */
export class SceneryLooks {
  readonly #looks = new Map<string, Material>();

  /** The material one placement (`evidence`) draws a part with, whose library material is `source`. */
  of(source: Material, evidence: PlacementEvidence): Material {
    if (isTextured(source)) return source;
    const sceneryClass = materialClass(evidence, source);
    if (sceneryClass === 'file') return source;
    const tone = toneOf(source);
    const { side, transparent, opacity } = source;
    const key = `${sceneryClass}|${toneKey(tone)}|${side}|${transparent}|${opacity}`;
    let look = this.#looks.get(key);
    if (!look) {
      look = classMaterial(sceneryClass, tone, { side, transparent, opacity });
      // the beam rays read the class here: a beam goes around its own truss and never through a figure
      look.userData[CLASS_KEY] = sceneryClass;
      this.#looks.set(key, look);
    }
    return look;
  }

  /** Frees every class look; a freed look leaves the followers of the hall map. */
  dispose(): void {
    for (const look of this.#looks.values()) look.dispose();
    this.#looks.clear();
  }
}
