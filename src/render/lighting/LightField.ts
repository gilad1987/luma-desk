import { BackSide, BoxGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry } from 'three';
import { InstancedInterleavedBuffer, InterleavedBufferAttribute, Mesh, Scene, ShaderMaterial } from 'three';
import { ROW } from '../beams/packBeam';
import { lightFragmentShader, lightVertexShader } from './glsl';
import { EXTRA } from './LightBatch';
import { ADDITIVE, type LightUniforms } from './lightUniforms';

const ATTRIBUTES = ['iOrigin', 'iAxis', 'iColor', 'iGobo'] as const;
const FIRST_CAPACITY = 256;

type Buffers = [InstancedBufferGeometry, InstancedInterleavedBuffer, InstancedBufferAttribute];

/** A box around the unit cone (x and y in -1..1, z in 0..1) that is drawn once per row of `rows`. */
function createGeometry(rows: Float32Array, extras: Float32Array): Buffers {
  const box = new BoxGeometry(2, 2, 1).translate(0, 0, 0.5);
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(box.getIndex());
  geometry.setAttribute('position', box.getAttribute('position'));
  const buffer = new InstancedInterleavedBuffer(rows, ROW).setUsage(DynamicDrawUsage);
  ATTRIBUTES.forEach((name, i) => geometry.setAttribute(name, new InterleavedBufferAttribute(buffer, 4, i * 4)));
  const extra = new InstancedBufferAttribute(extras, EXTRA).setUsage(DynamicDrawUsage);
  geometry.setAttribute('iExtra', extra);
  return [geometry, buffer, extra];
}

/**
 * The light volume of every lit fixture as one instanced draw: a box per fixture, whose fragments light the scenery
 * that the scene depth shows inside the cone. The rows are the beam rows, so shaft and pool have one source. Only
 * the back faces are drawn and there is no depth test, so a camera inside a cone still sees its light.
 */
export class LightField {
  /** Holds only the volume mesh, so the pass draws it without the stage. */
  readonly scene = new Scene();
  readonly #mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  #rows = new Float32Array(FIRST_CAPACITY * ROW);
  #extras = new Float32Array(FIRST_CAPACITY * EXTRA);
  #buffer: InstancedInterleavedBuffer;
  #extra: InstancedBufferAttribute;

  constructor(uniforms: LightUniforms) {
    const material = new ShaderMaterial({
      ...ADDITIVE,
      uniforms,
      vertexShader: lightVertexShader,
      fragmentShader: lightFragmentShader,
      side: BackSide,
    });
    const [geometry, buffer, extra] = createGeometry(this.#rows, this.#extras);
    this.#buffer = buffer;
    this.#extra = extra;
    this.#mesh = new Mesh(geometry, material);
    // the box has no bounds of its own: the vertex shader places it from the instance row
    this.#mesh.frustumCulled = false;
    this.scene.add(this.#mesh);
  }

  /** The beam rows; valid until the next `reserve`. */
  get rows(): Float32Array {
    return this.#rows;
  }

  /** The extras of each row (`EXTRA` floats); valid until the next `reserve`. */
  get extras(): Float32Array {
    return this.#extras;
  }

  /** Makes room for `count` rows. A bigger stage gets new buffers of twice the size, so no light is dropped. */
  reserve(count: number): void {
    let capacity = this.#rows.length / ROW;
    if (count <= capacity) return;
    while (capacity < count) capacity *= 2;
    this.#rows = new Float32Array(capacity * ROW);
    this.#extras = new Float32Array(capacity * EXTRA);
    this.#mesh.geometry.dispose();
    [this.#mesh.geometry, this.#buffer, this.#extra] = createGeometry(this.#rows, this.#extras);
  }

  /** Draws the first `count` rows from now on and sends rows and extras to the GPU. */
  show(count: number): void {
    this.#mesh.geometry.instanceCount = count;
    this.#buffer.needsUpdate = true;
    this.#extra.needsUpdate = true;
  }

  /** Frees the geometry and the program. */
  dispose(): void {
    this.#mesh.geometry.dispose();
    this.#mesh.material.dispose();
  }
}
