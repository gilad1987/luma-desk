import { CircleGeometry, type BufferGeometry } from 'three';
import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';
import type { FixtureBody } from '../../../mvr/import/fixtureBodies';
import { trustedBeamRadius } from './beamRadius';
import type { GdtfBodyProto } from './GdtfBodyProto';
import { GdtfProtoBuilder, type DefaultMeshSource, type ProtoMiss } from './GdtfProtoBuilder';
import type { BodyNotes, GdtfBodyInput, GdtfBodyStats, NoteKind } from './GdtfBodyStats';
import { parseGdtfMesh, type ParseMesh } from './parseGdtfMesh';

type Size = readonly [number, number, number];

/** The GDTF triangles a whole rig may draw; past it the next bodies take the desk model, so a rig stays drawable. */
export const RIG_TRIANGLES = 2_000_000;

/**
 * The fixture bodies of one import, by the plan the import made (`bodyDraw`). `gdtf` draws the model files, each
 * parsed once and fitted to its model size; fixtures of one tree share one prototype and so their geometry.
 * `deskAtBox`, and a `gdtf` body whose files do not parse, give the overall box the desk model is fitted to. Every
 * other fixture keeps its desk model as it is. The library holds no model bytes: `load` empties the import's map.
 * Every fixture whose plan the draw cannot keep gets a note, so the summary reports it.
 */
export class GdtfBodyLibrary {
  readonly stats: GdtfBodyStats;
  /** The notes of each fixture by MVR uuid, for the summary. */
  readonly notes = new Map<string, BodyNotes>();
  readonly lens: BufferGeometry = new CircleGeometry(1, 24).rotateX(Math.PI / 2);
  readonly #builder: GdtfProtoBuilder;
  readonly #protos = new Map<string, GdtfBodyProto>();
  readonly #boxes = new Map<string, Size>();
  readonly #facts = new Map<string, FixtureBody>();
  readonly #budget: number;
  /** The GDTF triangles the rig draws so far. */
  #drawn = 0;
  constructor(parse: ParseMesh = parseGdtfMesh, budget = RIG_TRIANGLES, defaults?: DefaultMeshSource) {
    this.#builder = new GdtfProtoBuilder(parse, defaults);
    this.#budget = budget;
    this.stats = { mesh: 0, shapes: 0, fitted: 0, desk: 0, multiHead: 0, failed: this.#builder.failed };
  }

  async load({ bodies, gdtfMeshes }: GdtfBodyInput): Promise<void> {
    // fixtures of one GDTF file and mode share the tree object, so the tree is the key of their prototype
    const shared = new Map<GdtfNode | undefined, GdtfBodyProto | ProtoMiss | undefined>();
    for (const [uuid, body] of bodies) {
      this.#facts.set(uuid, body);
      const root = body.body?.root;
      if (body.draw === 'gdtf' && !shared.has(root)) shared.set(root, await this.#builder.proto(body, gdtfMeshes));
      const built = body.draw === 'gdtf' ? shared.get(root) : undefined;
      const miss = built && 'kind' in built ? built : undefined;
      const proto = built && !('kind' in built) && this.#drawn + built.triangles <= this.#budget ? built : undefined;
      // a body past the rig budget is the only miss with a prototype
      const over = built && !miss && !proto ? ({ kind: 'budget', triangles: this.#budget } as const) : undefined;
      if (!proto) this.#desk(uuid, body, miss ?? over);
      else {
        this.#drawn += proto.triangles;
        this.#protos.set(uuid, proto);
        this.stats[body.bodyClass === 'boxes' ? 'shapes' : 'mesh']++;
        if (proto.extraAxes > 0) this.stats.multiHead++;
      }
    }
    this.#builder.clear();
    gdtfMeshes.clear();
  }

  /** Files a note on the fixture for the summary; `count` is the triangles of `dense` and `budget`. */
  note(uuid: string, kind: NoteKind, count = 0): void {
    this.notes.set(uuid, new Map(this.notes.get(uuid)).set(kind, count));
  }

  /** The prototype of the fixture with this MVR uuid; undefined when the desk model stands in. */
  protoOf(uuid: string): GdtfBodyProto | undefined {
    return this.#protos.get(uuid);
  }

  /** The box the desk model of this fixture is fitted to, in metres on the app X, Y, Z; undefined: no fit. */
  boxOf(uuid: string): Size | undefined {
    return this.#boxes.get(uuid);
  }

  /** The GDTF beam radius of this fixture in metres; undefined when its tree is not one to trust. */
  beamRadiusOf(uuid: string): number | undefined {
    return trustedBeamRadius(this.#facts.get(uuid));
  }

  /** Frees every geometry; the fixture visuals that draw them must be rebuilt without this library first. */
  dispose(): void {
    for (const geometry of [this.lens, ...this.#builder.owned]) geometry.dispose();
    for (const held of [this.#builder.owned, this.#protos, this.#boxes, this.#facts]) held.clear();
  }

  /** The desk model for a fixture, at the GDTF box when it has one; `miss` says why a planned GDTF model is not drawn. */
  #desk(uuid: string, body: FixtureBody, miss: ProtoMiss | undefined): void {
    const box = body.draw === 'gdtf' || body.draw === 'deskAtBox' ? body.box : undefined;
    this.stats[box ? 'fitted' : 'desk']++;
    if (!box) return;
    // GDTF X, Y and Z (Length, Width, Height) are the app X, Z and Y
    this.#boxes.set(uuid, [box[0], box[2], box[1]]);
    if (body.draw !== 'gdtf') return;
    this.note(uuid, miss?.kind ?? 'unread', miss?.triangles ?? 0);
  }
}
