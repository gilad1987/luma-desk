import type { StageDesign, StageScreen } from '../../domain/stage/StageDesign';
import type { StageTruss } from '../../domain/stage/trussTypes';
import type { Quat, SceneryPart, Vec3 } from '../../domain/stage/types';
import { REST_ROTATION } from '../math/restRotation';
import type { MeshShape } from './MeshShape';

/** One stage object to write; `shape` names its mesh file, `shape.kind` and `id` key its uuid, `part` its layer. */
export interface ObjectSpec {
  readonly tag: 'Truss' | 'SceneObject' | 'VideoScreen';
  readonly shape: MeshShape;
  readonly part: SceneryPart;
  readonly id: string;
  readonly name: string;
  readonly position: Vec3;
  readonly rotation: Quat;
}

function trussSpec(truss: StageTruss): ObjectSpec {
  const { position, rotation = REST_ROTATION } = truss.transform;
  const shape: MeshShape = { kind: 'truss', params: truss.params };
  return { tag: 'Truss', shape, part: 'trusses', id: truss.id, name: truss.name, position, rotation };
}

/**
 * The deck at the centre of its footprint on the floor, then the risers at the centre of their tops. Risers stand on
 * the deck and belong to the same scenery part, so a hidden deck hides them too (contract Amendment 3).
 */
function deckSpecs({ deck, risers, scenery }: StageDesign): ObjectSpec[] {
  if (!scenery.deck) return [];
  const base = { tag: 'SceneObject', part: 'deck', rotation: REST_ROTATION } as const;
  const centre: Vec3 = [(deck.x0 + deck.x1) / 2, 0, (deck.z0 + deck.z1) / 2];
  const raised = risers.map((riser): ObjectSpec => {
    const shape: MeshShape = { kind: 'riser', size: riser.size };
    return { ...base, shape, id: riser.id, name: `Riser ${riser.id}`, position: riser.at };
  });
  const deckShape: MeshShape = { kind: 'deck', size: [deck.x1 - deck.x0, deck.height, deck.z1 - deck.z0] };
  return [{ ...base, shape: deckShape, id: 'deck', name: 'Deck', position: centre }, ...raised];
}

/** A turn of `yaw` radians about Y, the only rotation a side screen has. */
const yawRotation = (yaw: number): Quat => [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];

/** The LED wall at the centre of its face, then its side screens, numbered from 1. */
function screenSpecs(screen: StageScreen): ObjectSpec[] {
  const base = { tag: 'VideoScreen', part: 'ledWall' } as const;
  const wall: Vec3 = [(screen.x0 + screen.x1) / 2, (screen.y0 + screen.y1) / 2, screen.z];
  const wallShape: MeshShape = { kind: 'screen', width: screen.x1 - screen.x0, height: screen.y1 - screen.y0 };
  const sides = (screen.sides ?? []).map((side, index): ObjectSpec => ({
    ...base,
    shape: { kind: 'screen', width: side.width, height: side.height },
    id: `${screen.id}-side-${index + 1}`,
    name: `Side screen ${screen.id} ${index + 1}`,
    position: side.at,
    rotation: yawRotation(side.yaw),
  }));
  const name = `LED wall ${screen.id}`;
  return [{ ...base, shape: wallShape, id: screen.id, name, position: wall, rotation: REST_ROTATION }, ...sides];
}

/**
 * The trusses, deck, risers and screens of a design as objects to write, so a console shows the stage the fixtures
 * hang on. A hidden deck (an imported stage brings its own) and its risers are not written, and neither are the LED
 * wall and side screens when the `ledWall` part is hidden: the desk does not draw them either, and their numbers still
 * travel in the luma data. Trusses are written whether the `trusses` part is shown or not.
 */
export function objectSpecs(design: StageDesign): ObjectSpec[] {
  const screens = design.scenery.ledWall ? design.screens.flatMap(screenSpecs) : [];
  return [...design.trusses.map(trussSpec), ...deckSpecs(design), ...screens];
}
