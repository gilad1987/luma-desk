import type { StageDeck } from '../../domain/stage/StageDesign';
import type { StageBounds, SurfaceBox, Vec3 } from '../../domain/stage/types';
import { STAGE } from '../../domain/venue';
import { emptyBox, pointBox, shiftBox, union, type Aabb } from '../math/Aabb';
import type { MvrWarning } from '../MvrWarning';
import { detectDeck } from './detectDeck';
import { fitOffset } from './fitOffset';
import type { LayerBox } from './layerBoxes';
import { stageBox } from './stageBox';
import { topSurfaces } from './surfaces';

/**
 * The deck when the file has none: the desk's stage rectangle at height 0. Roles and the front edge still need a
 * rectangle, while height 0 keeps floor fixtures and beam spots on the ground, where the file put them. The deck
 * scenery is off for imports, so this deck is not drawn.
 */
const GROUND_DECK: StageDeck = { x0: STAGE.x0, x1: STAGE.x1, z0: STAGE.z0, z1: STAGE.z1, height: 0 };

/** What the fit reads, in the three frame before the fit offset. */
export interface FitInput {
  readonly positions: readonly Vec3[];
  readonly meshBoxes: readonly Aabb[];
  readonly layers: readonly LayerBox[];
  /** Uuids of the venue-hall layers, which `stageBox` leaves out of the box the offset centres. */
  readonly hall: readonly string[];
}

/** The imported scene placed on the stage: everything in the fitted world frame. */
export interface FittedScene {
  readonly offset: Vec3;
  /** The layer boxes moved by the offset. */
  readonly layers: readonly LayerBox[];
  /** Fixture positions in input order. */
  readonly positions: readonly Vec3[];
  readonly surfaces: readonly SurfaceBox[];
  readonly deck: StageDeck;
  /** Fixtures, meshes and the deck rectangle, so the camera frames all of them. */
  readonly bounds: StageBounds;
}

/**
 * A fit the file already states: a luma export holds desk world points (less the offset it names) and its own deck,
 * so the import neither moves the scene nor searches for a deck.
 */
export interface FixedFit {
  readonly offset: Vec3;
  readonly deck: StageDeck;
}

const add = (p: Vec3, d: Vec3): Vec3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];

/** The box around the deck rectangle from the ground to its top. */
const deckBox = (deck: StageDeck): Aabb => ({ min: [deck.x0, 0, deck.z0], max: [deck.x1, deck.height, deck.z1] });

/**
 * Fits fixtures and mesh boxes on the stage and derives what depends on the fitted frame: landing surfaces, the deck,
 * the layer boxes and the camera bounds. One place, so every output uses the same offset. The offset centres the
 * stage box (`stageBox`: no hall, no FOH outliers); the camera bounds still hold every mesh and fixture. With
 * `fixed`, its offset and deck are used as they are.
 */
export function fitScene(input: FitInput, warn: (warning: MvrWarning) => void, fixed?: FixedFit): FittedScene {
  const { meshBoxes } = input;
  const offset = fixed?.offset ?? fitOffset(stageBox(input.layers, input.positions, input.hall), warn);
  const positions = input.positions.map((p) => add(p, offset));
  const surfaces = topSurfaces(meshBoxes, offset);
  const deck = fixed?.deck ?? detectDeck(surfaces, positions) ?? GROUND_DECK;
  const footprint = [...meshBoxes, ...input.positions.map(pointBox)].reduce(union, emptyBox());
  const bounds = [deckBox(deck), shiftBox(footprint, offset)].reduce(union);
  const layers = input.layers.map((layer) => ({ ...layer, box: shiftBox(layer.box, offset) }));
  return { offset, layers, positions, surfaces, deck, bounds };
}
