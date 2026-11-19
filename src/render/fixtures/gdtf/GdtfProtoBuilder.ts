import type { BufferGeometry } from 'three';
import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';
import type { FixtureBody } from '../../../mvr/import/fixtureBodies';
import { buildProto } from './buildProto';
import { DefaultShapes, type DefaultMeshSource } from './DefaultShapes';
import { fetchDefaultMesh } from './fetchDefaultMesh';
import { fitMatrix } from './fitToModel';
import { OWNED, type GdtfBodyProto } from './GdtfBodyProto';
import type { GdtfBodyInput } from './GdtfBodyStats';
import { trianglesOf, type PlacedGeometry } from './mergePlain';
import { modelPaths } from './nodeDrawable';
import type { ParseMesh } from './parseGdtfMesh';
import type { ProtoMiss } from './ProtoMiss';

export type { DefaultMeshSource } from './DefaultShapes';
export type { ProtoMiss } from './ProtoMiss';

/**
 * The triangles one body may draw. The GDTF spec asks about 1,200 vertices of the default model; a CAD export can hold
 * a million, which a rig of such bodies cannot draw at a usable frame rate.
 */
export const PROTO_TRIANGLES = 20_000;

/**
 * Builds the prototype of a geometry tree from its model files. Each file is parsed once, fitted to its model size
 * and taken out of the import's byte map, so the bytes are not held beside the geometry.
 */
export class GdtfProtoBuilder {
  /** The files a drawn part needs that are missing, do not parse or hold no triangle: by mesh key, or a default mesh. */
  readonly failed: string[] = [];
  /** The section geometries of every prototype built here; the library disposes them. */
  readonly owned = new Set<BufferGeometry>();
  readonly #parse: ParseMesh;
  /** The parsed model files by mesh key, in file units; undefined: the file cannot be drawn. */
  readonly #meshes = new Map<string, BufferGeometry | undefined>();
  readonly #shapes: DefaultShapes;

  constructor(parse: ParseMesh, defaults: DefaultMeshSource = fetchDefaultMesh) {
    this.#parse = parse;
    this.#shapes = new DefaultShapes(parse, defaults, this.failed);
  }

  /** A miss when the tree cannot be drawn whole (the desk model stands in); undefined when it draws nothing. */
  async proto(body: FixtureBody, bytes: GdtfBodyInput['gdtfMeshes']): Promise<GdtfBodyProto | ProtoMiss | undefined> {
    const root = body.body?.root;
    if (!root) return undefined;
    // the keys of `MvrImport.gdtfMeshes` (`meshKey`): the GDTF file name, then the path inside it
    const prefix = `${body.gdtfFile ?? ''}/`;
    for (const path of modelPaths(root)) await this.#read(prefix + path, bytes);
    await this.#shapes.prepare(root);
    // a drawn part without its mesh would leave a hole (a yoke without its head, a lens in the air): the whole body
    // falls back to the desk model, never a half body. Past the limit no part is merged, so the count stays cheap.
    const missing = new Set<string>();
    let triangles = 0;
    const proto = buildProto(
      root,
      body.body?.beamPath,
      (node) => {
        const part = this.#part(node, prefix, missing);
        triangles += part ? trianglesOf(part.geometry) : 0;
        return missing.size > 0 || triangles > PROTO_TRIANGLES ? undefined : part;
      },
      body.bodyClass !== 'meshVendorSymbol',
    );
    for (const key of missing) if (!this.failed.includes(key)) this.failed.push(key);
    const kind = missing.size > 0 ? 'unread' : (triangles > PROTO_TRIANGLES && 'dense') || undefined;
    for (const section of OWNED) {
      const geometry = proto?.[section];
      if (geometry && kind) geometry.dispose();
      else if (geometry) this.owned.add(geometry);
    }
    return kind ? { kind, triangles } : proto;
  }

  clear = (): void => this.#meshes.clear();

  /** The mesh of a drawn part fitted to its model size, or its default shape; a needed file that is absent is missing. */
  #part(node: GdtfNode, prefix: string, missing: Set<string>): PlacedGeometry | undefined {
    const key = node.model?.path === undefined ? undefined : prefix + node.model.path;
    const mesh = key === undefined ? undefined : this.#meshes.get(key);
    if (mesh) return { geometry: mesh, matrix: fitMatrix(mesh, node.model?.size ?? [0, 0, 0]) };
    // a model with a file in the archive is drawn from that file alone; only a model without one takes a shape
    if (key === undefined) return this.#shapes.part(node);
    missing.add(key);
    return undefined;
  }

  /** Parses a model file once and takes its bytes out of the import; a missing, bad or empty file maps to undefined. */
  async #read(key: string, bytes: GdtfBodyInput['gdtfMeshes']): Promise<void> {
    if (this.#meshes.has(key)) return;
    const file = bytes.get(key);
    bytes.delete(key);
    // a 3DS loader gives an empty result for bad bytes instead of throwing, so an empty mesh counts as unreadable
    const mesh = file && (await this.#parse(key, file).catch(() => undefined));
    this.#meshes.set(key, mesh && trianglesOf(mesh) > 0 ? mesh : undefined);
  }
}
