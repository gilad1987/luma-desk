import { Group, InstancedMesh, Matrix4, type Object3D } from 'three';
import type { Vec3 } from '../../domain/stage/types';
import { toThree, type MvrGeometry, type MvrProxy } from '../../mvr/index';
import { LedProxyLook } from './led/ledProxyLook';
import { proxyGeometry, proxyMaterial, type DrawnProxyKind } from './proxiesShapes';

/** The name of the group that holds a layer's proxy meshes, so one flag hides the proxies of the layer. */
export const PROXY_GROUP = 'mvr-proxies';

/**
 * The proxy groups of the stages now built. The "Show proxies" choice of the import summary reaches them here
 * (`showProxies`), as the app holds the scenery behind a wrapper that passes on layer choices only.
 */
const holders = new Set<Object3D>();

/** T(offset)·toThree(frame)·S: the proxy's frame in the three frame, with the unit shape one pitch wide. */
function proxyMatrix(proxy: MvrProxy, offset: Vec3): Matrix4 | undefined {
  if (!proxy.frame || proxy.pitch === undefined) return undefined;
  const pitch = proxy.pitch / 1000;
  const placed = new Matrix4().makeTranslation(offset[0], offset[1], offset[2]);
  return placed
    .multiply(new Matrix4().fromArray(toThree(proxy.frame)))
    .multiply(new Matrix4().makeScale(pitch, 1, pitch));
}

/** One instanced mesh for the proxies of one kind on one layer. */
function proxyMesh(kind: DrawnProxyKind, matrices: readonly Matrix4[]): InstancedMesh {
  const mesh = new InstancedMesh(proxyGeometry(kind), proxyMaterial(kind), matrices.length);
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.receiveShadow = true;
  mesh.name = `mvr-proxy-${kind}`;
  // The stage frees an instanced mesh with `dispose()` and leaves geometry and material to the mesh library. These
  // two are not the library's, so the mesh frees them on the same call.
  mesh.addEventListener('dispose', () => {
    if (mesh.parent) holders.delete(mesh.parent);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  return mesh;
}

/** Adds the meshes of one kind on one layer. Panels draw as LED walls; a duplicate of a panel gets its own mesh. */
function addKind(holder: Group, kind: DrawnProxyKind, onLayer: readonly MvrProxy[], led: LedProxyLook): void {
  const mine = onLayer.filter((proxy) => proxy.kind === kind);
  for (const group of kind === 'panel' ? led.split(mine) : [{ panels: mine, keepers: [] }]) {
    const matrices = group.panels.flatMap((proxy) => proxyMatrix(proxy, led.offset) ?? []);
    if (matrices.length === 0) continue;
    const mesh = proxyMesh(kind, matrices);
    if (kind === 'panel') led.dress(mesh, group);
    holder.add(mesh);
  }
}

/**
 * Adds the proxies of `geometry` to the layer groups: per layer one `PROXY_GROUP` with one instanced mesh per kind,
 * so proxies follow their layer's `visible` flag. A layer that holds only proxies gets its group here. Nothing is
 * made for a file without proxies, and `unknown` ones are never drawn.
 */
export function addProxyMeshes(layers: Map<string, Group>, geometry: MvrGeometry): void {
  const kinds: readonly DrawnProxyKind[] = ['panel', 'seat'];
  const led = new LedProxyLook(geometry);
  for (const layer of new Set((geometry.proxies ?? []).map((proxy) => proxy.layer))) {
    const holder = new Group();
    holder.name = PROXY_GROUP;
    const onLayer = (geometry.proxies ?? []).filter((proxy) => proxy.layer === layer);
    for (const kind of kinds) addKind(holder, kind, onLayer, led);
    if (holder.children.length === 0) continue;
    led.holder(layer, holder);
    holders.add(holder);
    const group = layers.get(layer) ?? new Group();
    layers.set(layer, group.add(holder));
  }
}

const isInstanced = (node: Object3D): node is InstancedMesh => node instanceof InstancedMesh;

/** The proxy meshes of one kind under `root`, one per layer; a later look (the LED shader) finds its meshes here. */
export function proxyMeshes(root: Object3D, kind: DrawnProxyKind): InstancedMesh[] {
  const found: InstancedMesh[] = [];
  root.traverse((node) => {
    if (isInstanced(node) && node.name === `mvr-proxy-${kind}`) found.push(node);
  });
  return found;
}

/**
 * Shows or hides every proxy now built (the "Show proxies" choice); a hidden layer stays hidden either way. The
 * choice is for the stage on screen: a stage built later shows its proxies, which is the default.
 */
export function showProxies(shown: boolean): void {
  for (const holder of holders) holder.visible = shown;
}
