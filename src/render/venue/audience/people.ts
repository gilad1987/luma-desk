import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { SEAT_TOP } from './legs';
import { chance, fillOrder } from './occupancy';
import { HAIRS, SKINS, TOPS, TROUSERS } from './palette';

/** The front of the proxy seat's back, in seat pitches behind the seat centre (`proxiesShapes.ts`). */
export const SEAT_BACK = 0.25;
/** The widest turn of a body off the seat's facing, radians: people sit a little askew. */
const YAW = 0.28;
/** Size variety on top of the body library: 3 % either way. */
const SIZE = 0.06;

/** Everyone who can sit on the seats of one layer, per seat index, ready to copy into instance buffers. */
export interface People {
  /** Seat frame with the person's turn and size: the figure's origin sits on the seat at the seat back. */
  readonly matrix: Float32Array;
  /** Clothing colour of the upper body, linear RGB. */
  readonly color: Float32Array;
  /** Palette indices of skin, hair and trousers, and the idle phase. */
  readonly look: Float32Array;
  /** Index into the body library. */
  readonly variant: Uint8Array;
  /** The seat indices in the order they fill (`fillOrder`). */
  readonly order: Uint32Array;
}

/**
 * The people for the seats of `seats`, a seat proxy mesh. The seat instance gives place, facing and pitch, so a
 * figure sits on the very proxy that is drawn. Every trait is a fixed function of the seat index.
 */
export function seatPeople(seats: InstancedMesh, variants: number): People {
  const n = seats.count;
  const people: People = {
    matrix: new Float32Array(n * 16),
    color: new Float32Array(n * 3),
    look: new Float32Array(n * 4),
    variant: new Uint8Array(n),
    order: fillOrder(n),
  };
  const [seat, local, tint] = [new Matrix4(), new Matrix4(), new Color()];
  const [at, pitch, hips, size] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const [facing, turn] = [new Quaternion(), new Quaternion()];
  const [one, up] = [new Vector3(1, 1, 1), new Vector3(0, 1, 0)];
  const pick = (count: number, index: number, salt: number): number => Math.floor(chance(index, salt) * count);
  for (let i = 0; i < n; i++) {
    seats.getMatrixAt(i, seat);
    seat.decompose(at, facing, pitch);
    // The seat proxy is scaled to its pitch; a person is not, and only the seat back moves with the pitch.
    hips.set(0, SEAT_TOP, SEAT_BACK * pitch.z);
    turn.setFromAxisAngle(up, (chance(i, 2) - 0.5) * YAW);
    local.compose(hips, turn, size.setScalar(1 - SIZE / 2 + SIZE * chance(i, 1)));
    seat
      .compose(at, facing, one)
      .multiply(local)
      .toArray(people.matrix, i * 16);
    tint.set(TOPS[pick(TOPS.length, i, 3)] ?? TOPS[0]).toArray(people.color, i * 3);
    const look = [pick(SKINS.length, i, 4), pick(HAIRS.length, i, 5), pick(TROUSERS.length, i, 6), chance(i, 7)];
    people.look.set(look, i * 4);
    people.variant[i] = pick(variants, i, 8);
  }
  return people;
}
