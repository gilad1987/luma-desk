import type { Material, Texture } from 'three';
import { classMaterial, reflects } from './classLooks';
import { createHallEnvironment } from './hallEnvironment';
import { materialClass, type PlacementEvidence } from './materialClass';
import { isTextured } from './sceneryStyle';
import { toneKey, toneOf } from './sceneryTone';

/**
 * The class looks of one import's scenery (`materialClass`, `classMaterial`): one shared material per class, file
 * tone and surface settings, so merging and instancing still group a plot into a few draw calls. A textured part and
 * a part whose file values win (`file`) keep the library's material. The hall environment is made on the first look
 * that reflects, so nothing is made before an MVR loads, and `dispose` frees it with the looks on stage change.
 */
export class SceneryLooks {
  readonly #looks = new Map<string, Material>();
  #environment: Texture | undefined;

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
      const environment = reflects(sceneryClass) ? this.#hall() : null;
      look = classMaterial(sceneryClass, tone, { side, transparent, opacity }, environment);
      this.#looks.set(key, look);
    }
    return look;
  }

  /** Frees every class look and the hall environment (and with it the renderer's prefiltered copy). */
  dispose(): void {
    for (const look of this.#looks.values()) look.dispose();
    this.#looks.clear();
    this.#environment?.dispose();
    this.#environment = undefined;
  }

  #hall(): Texture {
    this.#environment ??= createHallEnvironment();
    return this.#environment;
  }
}
