import { makeMvr } from './makeMvr.ts';
import { sceneXml } from './sceneXml.ts';

/** One mesh placement of a test scene: the mesh file, the object's MVR matrix text (mm) and its layer uuid. */
export interface TestPlacement {
  readonly file: string;
  readonly matrix?: string;
  readonly layer?: string;
}

/**
 * An `.mvr` with one `<SceneObject>` per placement, grouped into layers by uuid, and the given mesh files at the
 * archive root. Render tests describe a scene as a list of placements instead of writing the XML out.
 */
export function meshScene(
  placements: readonly TestPlacement[],
  files: Readonly<Record<string, Uint8Array>>,
): Uint8Array {
  const layers = new Map<string, string[]>();
  placements.forEach(({ file, matrix = '{1,0,0}{0,1,0}{0,0,1}{0,0,0}', layer = 'L1' }, index) => {
    const geometries = `<Geometries><Geometry3D fileName="${file}"/></Geometries>`;
    const body = `<Matrix>${matrix}</Matrix>${geometries}`;
    const object = `<SceneObject uuid="S${index}" name="S${index}">${body}</SceneObject>`;
    layers.set(layer, [...(layers.get(layer) ?? []), object]);
  });
  const layerXml = [...layers].map(
    ([uuid, objects]) => `<Layer uuid="${uuid}" name="${uuid}"><ChildList>${objects.join('')}</ChildList></Layer>`,
  );
  return makeMvr(sceneXml(layerXml.join('')), files);
}
