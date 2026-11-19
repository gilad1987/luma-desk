import { Vector2 } from 'three';
import type { MeshBasicMaterial, Texture } from 'three';
import { cellShape, faceMoments, type CellShape, type FaceMoments } from '../../post/lensCells';
import chunk from './lensCells.glsl?raw';

/** The lens material of one fixture with the cell law: its uniform (x body, y core) and the moments of its face. */
interface ShapedLens {
  readonly uniform: { readonly value: Vector2 };
  readonly moments: FaceMoments | undefined;
}

const lenses = new WeakMap<MeshBasicMaterial, ShapedLens>();
const faces = new WeakMap<Texture, { readonly moments: FaceMoments | undefined }>();
const SHAPE: CellShape = { body: 0, core: 0 };

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** The moments of a face that is a canvas, from its pixels, once per texture. The faces are drawn white on black. */
function momentsOf(map: Texture | null): FaceMoments | undefined {
  if (!map) return undefined;
  const known = faces.get(map);
  if (known) return known.moments;
  const image: unknown = map.image;
  let moments: FaceMoments | undefined;
  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
    const data = image.getContext('2d')?.getImageData(0, 0, image.width, image.height).data;
    if (data) {
      const texels = new Float32Array(data.length / 4);
      for (let i = 0; i < texels.length; i++) {
        const at = i * 4;
        texels[i] = toLinear(Math.max(data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0) / 255);
      }
      moments = faceMoments(texels);
    }
  }
  faces.set(map, { moments });
  return moments;
}

/** Adds the cell law to the fragment stage of the lens material, after the face texel is read. */
export function withLensCells(fragmentShader: string): string {
  return `uniform vec2 uLensCells;\n${fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n${chunk}`)}`;
}

function attach(material: MeshBasicMaterial): ShapedLens {
  const lens: ShapedLens = { uniform: { value: new Vector2() }, moments: momentsOf(material.map) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uLensCells'] = lens.uniform;
    shader.fragmentShader = withLensCells(shader.fragmentShader);
  };
  // one program for every lens with the law, and not the one of a plain basic material
  material.customProgramCacheKey = () => 'lens-cells';
  material.needsUpdate = true;
  lenses.set(material, lens);
  return lens;
}

/**
 * Gives the lens face of an MVR stage its radiance bound per texel, so the cells, ribs and rings of the face show
 * at any level (`cellShape`). `flat` is the radiance of a white texel under the one bound per material, and 0 for a
 * dark lens or the legacy model: a material that never had a level over 0 here is never touched, so a built-in
 * stage keeps its plain lens program.
 */
export function shapeLens(material: MeshBasicMaterial, flat: number): void {
  let lens = lenses.get(material);
  if (lens === undefined) {
    if (!(flat > 0)) return;
    lens = attach(material);
  }
  if (lens.moments) cellShape(flat, lens.moments, SHAPE);
  else SHAPE.body = SHAPE.core = 0;
  lens.uniform.value.set(SHAPE.body, SHAPE.core);
}
