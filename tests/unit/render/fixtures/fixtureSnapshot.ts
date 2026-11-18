import { BufferGeometry, Color, Material, Mesh, Object3D, Sprite, Texture, Vector2 } from 'three';

/**
 * Serialises the fixture side of the scene into one `type uuid hash` line per object, in traversal order. The
 * legacy tap in main.ts and the parity test both use it, so the golden compares like with like. Under a seeded
 * Math.random, three takes every uuid from the stream, so equal uuids prove equal creation order (decision 24).
 */
export interface FixtureSnapshotInput {
  /** Scene children added from the gobo block on, in scene order. */
  readonly roots: readonly Object3D[];
  /** Objects outside the scene graph, in legacy declaration order. */
  readonly resources: readonly (Texture | BufferGeometry | Material)[];
  /** The pick targets (legacy `pickables`, today `FixturePicker.register`). */
  readonly picks: ReadonlySet<Object3D>;
}

const round = (n: number): number => Math.round(n * 1e5) / 1e5;

const MATERIAL_KEYS = ['side', 'blending', 'transparent', 'depthWrite', 'fog', 'toneMapped', 'opacity'] as const;
const EXTRA_KEYS = ['metalness', 'roughness', 'polygonOffset', 'polygonOffsetFactor', 'color', 'emissive', 'map'];
const LIGHT_KEYS = ['intensity', 'distance', 'angle', 'penumbra', 'decay', 'color'];

function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

function value(v: unknown): unknown {
  if (typeof v === 'number') return round(v);
  if (v instanceof Color) return v.getHex();
  if (v instanceof Texture) return describeTexture(v);
  if (v instanceof Vector2) return [round(v.x), round(v.y)];
  return v;
}

function pick(source: object, keys: readonly string[]): Record<string, unknown> {
  const record = source as Record<string, unknown>;
  return Object.fromEntries(keys.filter((k) => k in record).map((k) => [k, value(record[k])]));
}

function describeTexture(t: Texture): object {
  const image = t.image as { width?: number; height?: number } | undefined;
  return { uuid: t.uuid, cs: t.colorSpace, center: t.center.toArray(), size: [image?.width, image?.height] };
}

function describeGeometry(g: BufferGeometry): object {
  const p = g.getAttribute('position');
  let sum = 0;
  for (let i = 0; i < p.count; i++) sum += p.getX(i) + p.getY(i) * 2 + p.getZ(i) * 3;
  const params = 'parameters' in g ? JSON.stringify(g.parameters) : '';
  return { type: g.type, uuid: g.uuid, params, count: p.count, sum: Math.round(sum * 1e3) / 1e3 };
}

function describeMaterial(m: Material): object {
  const shader = m as { vertexShader?: string; fragmentShader?: string; uniforms?: Record<string, { value: unknown }> };
  const uniforms = Object.entries(shader.uniforms ?? {}).map(([k, u]) => [k, value(u.value)]);
  const shaders = [shader.vertexShader, shader.fragmentShader].map((s) => (s === undefined ? '' : hash(s.trim())));
  return { type: m.type, uuid: m.uuid, ...pick(m, [...MATERIAL_KEYS, ...EXTRA_KEYS]), uniforms, shaders };
}

function describeObject(o: Object3D, picks: ReadonlySet<Object3D>): object {
  const out: Record<string, unknown> = {
    name: o.name,
    visible: o.visible,
    shadow: [o.castShadow, o.receiveShadow, o.frustumCulled],
    pose: [...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()].map(round),
    // `fix` was the legacy pick owner; the pick flag below carries the same fact
    userData: Object.keys(o.userData).filter((k) => k !== 'fix'),
    pick: picks.has(o),
    light: pick(o, LIGHT_KEYS),
  };
  if (o instanceof Mesh || o instanceof Sprite) {
    const mesh = o as Mesh<BufferGeometry, Material>;
    out['geometry'] = describeGeometry(mesh.geometry);
    out['material'] = describeMaterial(mesh.material);
  }
  return out;
}

function describeResource(r: Texture | BufferGeometry | Material): object {
  if (r instanceof Texture) return describeTexture(r);
  return r instanceof BufferGeometry ? describeGeometry(r) : describeMaterial(r);
}

/** One `type uuid hash` line per resource, then per scene object in traversal order. */
export function snapshotFixtureScene({ roots, resources, picks }: FixtureSnapshotInput): string[] {
  const lines = resources.map((r) => `${r.type} ${r.uuid} ${hash(JSON.stringify(describeResource(r)))}`);
  for (const root of roots)
    root.traverse((o) => lines.push(`${o.type} ${o.uuid} ${hash(JSON.stringify(describeObject(o, picks)))}`));
  return lines;
}
