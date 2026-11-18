import { Mesh, type Group, type Object3D, type Vector3 } from 'three';
import type { Fixture } from '../../../domain/Fixture';
import type { FixtureBody } from '../fixtureBody';
import { buildGdtfBody, type GdtfBuilt } from './buildGdtfBody';
import { fitDeskModel } from './fitDeskModel';
import type { GdtfBodyLibrary } from './GdtfBodyLibrary';

/** Which GDTF body a fixture has and where its root goes: the MVR insertion point in the desk frame. */
export interface GdtfPlacement {
  readonly uuid: string;
  readonly insertion?: readonly [number, number, number];
}

/** Where the fixture builder asks for a real body. */
export interface GdtfBodySource {
  /** The builder of the fixture's GDTF geometry; undefined keeps the desk model of the fixture type. */
  modelOf(f: Fixture): ((c: FixtureBody) => GdtfBuilt) | undefined;
  /**
   * Fits the built desk model in `g` to the GDTF box of the fixture. Gives the world offset the body moved by, for
   * the beam origin; undefined when the fixture has no box to fit to and the model stays as it is.
   */
  fitDesk(f: Fixture, g: Group): Vector3 | undefined;
  /** The GDTF `BeamRadius` in metres, the beam source radius; undefined keeps the radius of the drawn lens. */
  beamRadiusOf(f: Fixture): number | undefined;
  /**
   * Draws every mesh of a fixture body (base, yoke, head, lens, trim) after the scenery. A fixture hangs on scenery,
   * so a face of each can lie in one plane, and where their depths tie the later draw wins. three.js orders opaque
   * meshes by material id, and the fixture and scenery materials come from two loads that end in wall-clock order,
   * so the winner changed from run to run (one or two pixels of a tower in the bit-exact screenshots).
   */
  drawAfterScenery(body: Object3D): void;
}

/** The bodies of `library`, placed by `placementOf` (by fixture id), which reads the stage design of the moment. */
export function gdtfBodySource(
  library: Pick<GdtfBodyLibrary, 'protoOf' | 'boxOf' | 'note' | 'lens' | 'beamRadiusOf'>,
  placementOf: (id: number) => GdtfPlacement | undefined,
): GdtfBodySource {
  return {
    modelOf(f) {
      const place = placementOf(f.id),
        proto = place && library.protoOf(place.uuid);
      return proto && ((c) => buildGdtfBody(proto, library.lens, place.insertion, c));
    },
    fitDesk(f, g) {
      const place = placementOf(f.id),
        box = place && library.boxOf(place.uuid);
      if (!box) return undefined;
      // a static floor unit without a `rotation` (the desk's own floor pose) is built upright on its stand; `mount`
      // comes from the MVR matrix (`mountOf`: the hanging-pose base faces down)
      const standing = f.mount === 'floor' && !f.rotation && !f.T.moving;
      const fit = fitDeskModel(g, box, place.insertion, standing);
      if (fit.limited) library.note(place.uuid, 'limited');
      return fit.axisAt;
    },
    drawAfterScenery(body) {
      body.traverse((node) => {
        if (node instanceof Mesh) node.renderOrder = 1;
      });
    },
    beamRadiusOf(f) {
      const place = placementOf(f.id);
      return place && library.beamRadiusOf(place.uuid);
    },
  };
}
