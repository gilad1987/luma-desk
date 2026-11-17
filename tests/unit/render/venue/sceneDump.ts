import type { BufferGeometry, Material, Object3D, Texture } from 'three';

// Browser-safe on purpose (types only from three): the same dump ran inside the legacy page to record the golden.

const round = (n: number): number => Math.round(n * 1e5) / 1e5;

/** Rounds every number in a JSON-like value, so two engines that agree to 5 decimals give the same text. */
const rounded = (value: unknown): unknown => {
  if (typeof value === 'number') return round(value);
  if (Array.isArray(value)) return value.map(rounded);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rounded(v)]));
  return value;
};

const sum = (array: ArrayLike<number>): number => {
  let total = 0;
  for (let i = 0; i < array.length; i++) total += array[i] ?? 0;
  return Math.round(total * 1e3) / 1e3;
};

const texture = (t: Texture | null | undefined): unknown =>
  t && {
    uuid: t.uuid,
    source: t.source.uuid,
    wrap: [t.wrapS, t.wrapT],
    repeat: rounded(t.repeat.toArray()),
    center: t.center.toArray(),
    anisotropy: t.anisotropy,
    colorSpace: t.colorSpace,
    size: [(t.image as HTMLCanvasElement | null)?.width, (t.image as HTMLCanvasElement | null)?.height],
  };

const KEYS = ['color', 'roughness', 'metalness', 'flatShading', 'transparent', 'opacity', 'side', 'depthWrite'];
const MORE_KEYS = ['fog', 'toneMapped', 'vertexColors', 'size', 'sizeAttenuation', 'vertexShader', 'fragmentShader'];

const material = (m: Material): unknown => {
  const record = m as unknown as Record<string, unknown>;
  const fields = Object.fromEntries(
    [...KEYS, ...MORE_KEYS]
      .filter((k) => k in record)
      .map((k) => {
        const v = record[k];
        const hex = v && typeof v === 'object' && 'getHex' in v ? (v as { getHex(): number }).getHex() : v;
        return [k, hex];
      }),
  );
  const uniforms = record.uniforms as Record<string, { value: unknown }> | undefined;
  return {
    uuid: m.uuid,
    type: m.type,
    ...(rounded(fields) as object),
    map: texture(record.map as Texture | null),
    uniforms: uniforms && Object.keys(uniforms),
    patched: Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile'),
  };
};

const geometry = (g: BufferGeometry): unknown => ({
  uuid: g.uuid,
  type: g.type,
  parameters: rounded((g as unknown as { parameters?: unknown }).parameters),
  attributes: Object.keys(g.attributes)
    .sort()
    .map((name) => {
      const a = g.getAttribute(name);
      return [name, a.itemSize, a.count, sum(a.array)];
    }),
});

/** One object and its subtree, with every value that the scene build sets, as plain data in traversal order. */
export function dumpObject(o: Object3D): unknown {
  const r = o as unknown as Record<string, unknown>;
  const mats = r.material as Material | Material[] | undefined;
  const im = r.instanceMatrix as { array: Float32Array } | undefined;
  const ic = r.instanceColor as { array: Float32Array } | null | undefined;
  const light = 'intensity' in r ? [r.intensity, r.distance, r.decay, (r.color as { getHex(): number }).getHex()] : 0;
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
    geometry: r.geometry ? geometry(r.geometry as BufferGeometry) : 0,
    material: mats ? (Array.isArray(mats) ? mats.map(material) : material(mats)) : 0,
    instances: im ? [r.count, sum(im.array), ic ? sum(ic.array) : 0] : 0,
    light,
    children: o.children.map(dumpObject),
  };
}

/** The canonical text of one top-level object; the golden stores its hash. */
export const dumpText = (o: Object3D): string => JSON.stringify(dumpObject(o));
