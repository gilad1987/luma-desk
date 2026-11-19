import { MeshPhongMaterial, type Group, type LoadingManager } from 'three';

/**
 * Parses a 3DS file so that every material group of a mesh keeps its own material. The three.js loader numbers the
 * groups in file order but lists only the materials the file defines: after a group that names an undefined material
 * every later group draws with its neighbour's material, and the last ones with none. Here an undefined name gets a
 * plain stand-in (the loader's default grey, one per file) under that name when a group first asks for it, so the
 * list stays in step with the groups and the faces without a material are drawn (`meshPartsOf`).
 */
export async function parse3ds(buffer: ArrayBuffer, manager: LoadingManager): Promise<Group> {
  const { TDSLoader } = await import('three/examples/jsm/loaders/TDSLoader.js');
  class InStepLoader extends TDSLoader {
    #plain: MeshPhongMaterial | undefined;

    override readMaterialGroup(data: DataView): object {
      const group = super.readMaterialGroup(data);
      const name: unknown = Reflect.get(group, 'name');
      // the loader keeps its materials by name on an array object, so they are tested and set by key; only an own key
      // counts, or a material named `push` or `constructor` would find the array's inherited member and get no stand-in
      if (typeof name === 'string' && !Object.hasOwn(this.materials, name)) {
        Reflect.set(this.materials, name, (this.#plain ??= new MeshPhongMaterial()));
      }
      return group;
    }
  }
  return new InStepLoader(manager).parse(buffer, '');
}
