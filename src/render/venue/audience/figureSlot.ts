import { InstancedBufferAttribute, InstancedMesh, type Camera, type Material } from 'three';
import { figureGeometry, type Detail } from './figureGeometry';
import type { FigureSpec } from './FigureSpec';

/** The name of the group that holds a seat layer's audience meshes; the meshes carry it as a prefix. */
export const AUDIENCE_GROUP = 'mvr-audience';

/** One instanced mesh of the audience with the per-person buffers the layer writes. */
export interface Slot {
  readonly mesh: InstancedMesh;
  /** Palette indices of skin, hair and trousers, and the idle phase (`aLook`). */
  readonly look: InstancedBufferAttribute;
  /** Clothing colour of the upper body (the instance colour). */
  readonly tint: InstancedBufferAttribute;
}

/** The layer's side of a slot: the shared material, the camera and disposal reports, and the override-pass hook. */
export interface SlotHooks {
  readonly material: Material;
  /** Notes the camera that draws the layer; one mesh of a layer has it, as every mesh is drawn by the same camera. */
  readonly see?: (camera: Camera) => void;
  /** Reports that this mesh was disposed; the layer frees what the meshes share on the first report. */
  readonly gone: () => void;
  /** `audiencePass` of the layer; every mesh offers it as `userData.audiencePass`. */
  readonly pass: (override: Material) => Material;
}

/**
 * The mesh for up to `capacity` people of one figure at one level of detail; it draws none until the layer fills
 * it. The instance colour exists from the start, as the shader is compiled for it on the first draw.
 */
export function figureSlot(spec: FigureSpec, detail: Detail, capacity: number, hooks: SlotHooks): Slot {
  const { material } = hooks;
  const geometry = figureGeometry(spec, detail);
  const look = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  geometry.setAttribute('aLook', look);
  const mesh = new InstancedMesh(geometry, material, capacity);
  const tint = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  mesh.instanceColor = tint;
  mesh.count = 0;
  mesh.name = `${AUDIENCE_GROUP}-${detail}`;
  // People move between the meshes, so no bounding sphere stays true; the hall is in view nearly always.
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.userData['audiencePass'] = hooks.pass;
  const see = hooks.see;
  if (see) mesh.onBeforeRender = (_renderer, _scene, camera) => see(camera);
  // The stage frees instanced meshes with `dispose()`; the geometry is this mesh's own, and the layer frees the
  // material it shares with the other meshes (`gone`).
  mesh.addEventListener('dispose', () => {
    geometry.dispose();
    hooks.gone();
  });
  return { mesh, look, tint };
}
