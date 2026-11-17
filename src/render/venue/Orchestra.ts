import type { Object3D } from 'three';
import { DECK } from '../../domain/venue';
import type { BandMaterials } from './bandMaterials';
import { ORCHESTRA_ROWS } from './orchestraRows';
import { addPerformer } from './Performer';
import type { Instrument, Performer, Pose } from './performerSpec';

/** The seat x positions on the left side, outside in; the right side mirrors them. */
const SEAT_X = [-16.6, -15, -13.4, -11.8, -10.2] as const;
/** Left section (strings) per row, outside in. */
const LEFT: readonly (readonly Instrument[])[] = [
  ['violin', 'violin', 'violin', 'violin', 'violin'],
  ['violin', 'violin', 'violin', 'viola', 'viola'],
  ['dbass', 'cello', 'cello', 'cello', 'viola'],
];
/** Right section (winds, brass, timpani) per row, inside out; it is read mirrored. */
const RIGHT: readonly (readonly Instrument[])[] = [
  ['flute', 'flute', 'clarinet', 'clarinet', 'clarinet'],
  ['trombone', 'trombone', 'trumpet', 'trumpet', 'trumpet'],
  ['cello', 'cello', 'trombone', 'dbass', 'timpani'],
];
const POSE: Readonly<Partial<Record<Instrument, Pose>>> = {
  violin: 'violin',
  viola: 'violin',
  cello: 'cello',
  flute: 'up',
  clarinet: 'forward',
  trumpet: 'up',
  trombone: 'up',
  dbass: 'cello',
  timpani: 'forward',
};

/**
 * Builds the 20-piece orchestra on the side risers, seat by seat: for each row and seat, the left player, then the
 * mirrored right player. Double basses stand; the timpanist stands without a music stand.
 */
export function buildOrchestra(scene: Object3D, materials: BandMaterials): Performer[] {
  const players: Performer[] = [];
  ORCHESTRA_ROWS.forEach((row, ri) =>
    SEAT_X.forEach((x, xi) => {
      const left = LEFT[ri]?.[xi],
        right = RIGHT[ri]?.[4 - xi],
        y = DECK + row.h;
      if (left) {
        const seated = left !== 'dbass';
        players.push(
          addPerformer(scene, materials, {
            x,
            y,
            z: row.z,
            facing: 0.32,
            instrument: left,
            pose: POSE[left] ?? 'down',
            seated,
            stand: true,
          }),
        );
      }
      if (right) {
        const seated = !(right === 'dbass' || right === 'timpani');
        const spec = { x: -x, y, z: row.z, facing: -0.32, instrument: right, pose: POSE[right] ?? 'down', seated };
        players.push(addPerformer(scene, materials, { ...spec, stand: right !== 'timpani' }));
      }
    }),
  );
  return players;
}
