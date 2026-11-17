import { BufferGeometry, Color, InstancedMesh, Light, Mesh, Points, ShaderMaterial, Sprite, Texture } from 'three';
import type { Material, Object3D } from 'three';
import { rounded } from './rounded';

// The golden was recorded by running this dump inside the legacy page; the class checks below narrow types only and
// read the same fields in the same order, so the text (and its hash) is unchanged.

const sum = (array: ArrayLike<number>): number => {
  let total = 0;
  for (let i = 0; i < array.length; i++) total += array[i] ?? 0;
  return Math.round(total * 1e3) / 1e3;
};

/** A texture as data; a missing (`undefined`) or empty (`null`) slot passes through as the recording kept it. */
const texture = (t: unknown): unknown =>
  t instanceof Texture
    ? {
        uuid: t.uuid,
        source: t.source.uuid,
        wrap: [t.wrapS, t.wrapT],
        repeat: rounded(t.repeat.toArray()),
        center: t.center.toArray(),
        anisotropy: t.anisotropy,
        colorSpace: t.colorSpace,
        size: [(t.image as HTMLCanvasElement | null)?.width, (t.image as HTMLCanvasElement | null)?.height],
      }
    : t;

const KEYS = ['color', 'roughness', 'metalness', 'flatShading', 'transparent', 'opacity', 'side', 'depthWrite'];
const MORE_KEYS = ['fog', 'toneMapped', 'vertexColors', 'size', 'sizeAttenuation', 'vertexShader', 'fragmentShader'];

/** A material field by name; the keys differ per material class, so it is read by reflection. */
const field = (m: Material, key: string): unknown => {
  const value: unknown = Reflect.get(m, key);
  return value instanceof Color ? value.getHex() : value;
};

const material = (m: Material): unknown => ({
  uuid: m.uuid,
  type: m.type,
  ...(rounded(
    Object.fromEntries([...KEYS, ...MORE_KEYS].filter((k) => k in m).map((k) => [k, field(m, k)])),
  ) as object),
  map: texture(field(m, 'map')),
  uniforms: m instanceof ShaderMaterial ? Object.keys(m.uniforms) : undefined,
  patched: Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile'),
});

const geometry = (g: BufferGeometry): unknown => ({
  uuid: g.uuid,
  type: g.type,
  parameters: rounded('parameters' in g ? g.parameters : undefined),
  attributes: Object.keys(g.attributes)
    .sort()
    .map((name) => {
      const a = g.getAttribute(name);
      return [name, a.itemSize, a.count, sum(a.array)];
    }),
});

/** The scene object kinds that carry a geometry and a material. */
const isDrawable = (o: Object3D): o is Mesh | Points | Sprite =>
  o instanceof Mesh || o instanceof Points || o instanceof Sprite;

/** One object and its subtree, with every value that the scene build sets, as plain data in traversal order. */
export function dumpObject(o: Object3D): unknown {
  const mats = isDrawable(o) ? o.material : undefined;
  return {
    type: o.type,
    uuid: o.uuid,
    name: o.name,
    transform: rounded([
      o.position.toArray(),
      o.rotation.toArray().slice(0, 3),
      o.quaternion.toArray(),
      o.scale.toArray(),
    ]),
    flags: [o.castShadow, o.receiveShadow, o.frustumCulled, o.visible],
    userData: o.userData,
    geometry: isDrawable(o) && o.geometry instanceof BufferGeometry ? geometry(o.geometry) : 0,
    material: mats ? (Array.isArray(mats) ? mats.map(material) : material(mats)) : 0,
    instances:
      o instanceof InstancedMesh
        ? [o.count, sum(o.instanceMatrix.array), o.instanceColor ? sum(o.instanceColor.array) : 0]
        : 0,
    light:
      o instanceof Light ? [o.intensity, Reflect.get(o, 'distance'), Reflect.get(o, 'decay'), o.color.getHex()] : 0,
    children: o.children.map(dumpObject),
  };
}

/** The canonical text of one top-level object; the golden stores its hash. */
export const dumpText = (o: Object3D): string => JSON.stringify(dumpObject(o));
