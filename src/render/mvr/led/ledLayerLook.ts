import { DoubleSide, FrontSide, type Material, type Mesh, type Object3D, type Side } from 'three';
import { isDeskMade } from '../deskMade';
import { isMesh } from '../isMesh';
import { meshFront } from './ledMeshFront';
import { createLedMaterial, ledFrontIn, withLedFront } from './ledMaterial';
import { lightMesh, unlightMesh } from './ledMeshLight';
import { stageSides, type StageSides } from './ledStageSides';

export { followLedLayers, setLedLayers } from './ledLayerChoice';

/** The materials the meshes of a marked layer drew with before, so the mark can be taken off again. */
const own = new WeakMap<Object3D, Mesh['material']>();
/** The LED materials this module made, one per mesh; the other materials belong to the mesh library. */
const mine = new WeakSet<Material>();

const listOf = (material: Mesh['material']): Material[] => (Array.isArray(material) ? material : [material]);

/** The side the file draws a mesh with: of its materials when they agree, else both, so no face goes missing. */
function sideOf(material: Mesh['material']): Side {
  const [side = FrontSide, ...rest] = new Set(listOf(material).map((one) => one.side));
  return rest.length > 0 ? DoubleSide : side;
}

/** Frees the LED materials this module made for a mesh. */
function free(material: Mesh['material']): void {
  for (const one of listOf(material)) if (mine.delete(one)) one.dispose();
}

const made = <T extends Material>(material: T): T => {
  mine.add(material);
  return material;
};

/**
 * Gives a screen that the file itself names its front. Such a mesh comes with an LED material that emits on every
 * face (`MvrScreenMaterials`), as a material does not know its mesh: here it gets one of its own with the front of
 * the mesh, so the back and the edges of a screen box are the dark cabinet too. A mesh without one front stays as is.
 */
function frontScreen(node: Mesh, sides: () => StageSides): void {
  const isOpen = (material: Material): boolean => ledFrontIn(material)?.lengthSq() === 0;
  if (!listOf(node.material).some(isOpen)) return;
  const front = meshFront(node, sides());
  if (!front) return;
  const next = listOf(node.material).map((one) => (isOpen(one) ? made(withLedFront(one, front)) : one));
  node.material = Array.isArray(node.material) ? next : (next[0] ?? node.material);
}

/**
 * Draws the file meshes under `layer` as LED walls, or gives them their own materials back. The user marks a layer
 * when the file holds its LED wall as a plain solid with no screen evidence: the solid then shows the generated
 * content at the wall level in place of a dark block. Each mesh gets a material of its own with the look of `panel`
 * and the front of that mesh (`ledFrontOf`), worked out once here: only the faces to the audience emit, and the rest
 * of a solid stays the dark cabinet. The audience side comes from the seat proxies of the stage, else downstage. All
 * these materials share one program. Screens the file names get their front on the same walk (`frontScreen`). What
 * the desk itself draws in the layer (`isDeskMade`: panel proxies, seats, the audience) stays as it is.
 */
export function drawAsLed(layer: Object3D, panel: Material, isLed: boolean): void {
  // The sides of the stage are worked out once, and only for a layer that has a mesh to give a front to.
  let known: StageSides | undefined;
  const sides = (): StageSides => (known ??= stageSides(layer.parent ?? layer));
  layer.traverse((node) => {
    if (!isMesh(node) || isDeskMade(node)) return;
    const before = own.get(node);
    if (before === undefined) frontScreen(node, sides);
    if (isLed && before === undefined) {
      own.set(node, node.material);
      const front = meshFront(node, sides());
      // the file's side, as `withLedFront` keeps it: a one-sheet wall drawn from behind must not disappear
      node.material = made(createLedMaterial({ side: sideOf(node.material), ...(front ? { front } : {}) }));
      // a marked wall lights the stage as a panel wall does
      if (front) lightMesh(node, front);
    }
    if (!isLed && before !== undefined) {
      unlightMesh(node);
      free(node.material);
      node.material = before;
      own.delete(node);
    }
  });
}

/** Frees every LED material this module made for the meshes under `layer`; the stage calls it when it goes. */
export function freeLedMaterials(layer: Object3D): void {
  layer.traverse((node) => {
    if (!isMesh(node)) return;
    unlightMesh(node);
    free(node.material);
    const before = own.get(node);
    if (before !== undefined) free(before);
    own.delete(node);
  });
}
