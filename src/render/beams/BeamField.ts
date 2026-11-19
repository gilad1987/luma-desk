import { BackSide, CustomBlending, GLSL3, Mesh, OneFactor, Scene, ShaderMaterial } from 'three';
import type { InstancedBufferGeometry, InstancedInterleavedBuffer } from 'three';
import { createBeamGeometry } from './beamGeometry';
import { beamFragmentShader, beamVertexShader } from './glsl';
import { ROW } from './packBeam';
import type { VolumeUniforms } from './volumeUniforms';

const FIRST_CAPACITY = 256;

/**
 * Every beam of the stage as one instanced draw: a box per beam, whose fragments march the cone inside it. Only the
 * back faces are drawn and there is no depth test, so a camera inside a beam still sees it; the shader ends the
 * march at the scene depth itself.
 */
export class BeamField {
  /** Holds only the beam mesh, so the pass draws it without the stage. */
  readonly scene = new Scene();
  readonly #mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  #data = new Float32Array(FIRST_CAPACITY * ROW);
  #buffer: InstancedInterleavedBuffer;

  constructor(uniforms: VolumeUniforms) {
    const material = new ShaderMaterial({
      uniforms,
      vertexShader: beamVertexShader,
      fragmentShader: beamFragmentShader,
      glslVersion: GLSL3,
      side: BackSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
    });
    const [geometry, buffer] = createBeamGeometry(this.#data);
    this.#buffer = buffer;
    this.#mesh = new Mesh(geometry, material);
    // the box has no bounds of its own: the vertex shader places it from the instance row
    this.#mesh.frustumCulled = false;
    this.scene.add(this.#mesh);
  }

  /** The instance rows; valid until the next `reserve`. */
  get data(): Float32Array {
    return this.#data;
  }

  /** The number of rows the buffer holds. */
  get capacity(): number {
    return this.#data.length / ROW;
  }

  /** Makes room for `count` rows. A bigger stage gets a new buffer of twice the size, so no beam is dropped. */
  reserve(count: number): void {
    if (count <= this.capacity) return;
    let capacity = this.capacity;
    while (capacity < count) capacity *= 2;
    this.#data = new Float32Array(capacity * ROW);
    this.#mesh.geometry.dispose();
    const [geometry, buffer] = createBeamGeometry(this.#data);
    this.#mesh.geometry = geometry;
    this.#buffer = buffer;
  }

  /** Draws the first `count` rows from now on and sends those rows, not the whole buffer, to the GPU. */
  show(count: number): void {
    this.#mesh.geometry.instanceCount = count;
    this.#buffer.clearUpdateRanges();
    this.#buffer.addUpdateRange(0, count * ROW);
    this.#buffer.needsUpdate = true;
  }

  /** Frees the geometry and the program. */
  dispose(): void {
    this.#mesh.geometry.dispose();
    this.#mesh.material.dispose();
  }
}
