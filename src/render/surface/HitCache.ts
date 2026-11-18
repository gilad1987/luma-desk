import type { Vector3 } from 'three';

/** Sets of two slots. 2048 sets hold the 250 fixtures of a large rig with few rays that fall into one set. */
const SETS = 2048;

/**
 * Remembers the hit of each beam ray, so a fixture that does not move costs one lookup per frame and no walk. The
 * caller has no fixture id, so the key is the ray: its six numbers, compared exactly, plus the caller's epoch, which
 * it raises when the hit set changes. Two slots per set: a miss overwrites the one used longer ago, so two fixtures
 * in one set do not push each other out on every frame. Fixed typed arrays: a lookup allocates nothing.
 */
export class HitCache {
  /** Per slot: the hit distance (Infinity for no hit), then the normal x, y, z. The caller reads and writes them. */
  readonly values = new Float64Array(SETS * 2 * 4);
  /** Per slot: the shared normal object of a hit that the fixture sync tells by identity (`UP`), else undefined. */
  readonly shared: (Readonly<Vector3> | undefined)[] = [];
  readonly #keys = new Float64Array(SETS * 2 * 6);
  /** Per slot: the epoch of its entry; 0 marks an empty slot, so the caller's epochs start at 1. */
  readonly #epochs = new Uint32Array(SETS * 2);
  readonly #used = new Float64Array(SETS * 2);
  readonly #floats = new Float32Array(6);
  readonly #words = new Uint32Array(this.#floats.buffer);
  #tick = 0;
  #victim = 0;

  /** The slot that holds this ray's hit, or -1; after -1, `claim` gives the slot to fill. */
  find(origin: Vector3, direction: Vector3, epoch: number): number {
    const slot = this.#setOf(origin, direction) * 2;
    this.#tick += 1;
    for (let way = slot; way < slot + 2; way++) {
      if (this.#epochs[way] === epoch && this.#holds(way, origin, direction)) {
        this.#used[way] = this.#tick;
        return way;
      }
    }
    this.#victim = (this.#used[slot] ?? 0) <= (this.#used[slot + 1] ?? 0) ? slot : slot + 1;
    return -1;
  }

  /** Keys the slot that the last missed `find` chose to this ray and returns it; the caller then fills its values. */
  claim(origin: Vector3, direction: Vector3, epoch: number): number {
    const slot = this.#victim;
    const keys = this.#keys;
    const at = slot * 6;
    keys[at] = origin.x;
    keys[at + 1] = origin.y;
    keys[at + 2] = origin.z;
    keys[at + 3] = direction.x;
    keys[at + 4] = direction.y;
    keys[at + 5] = direction.z;
    this.#epochs[slot] = epoch;
    this.#used[slot] = this.#tick;
    return slot;
  }

  /** The set of a ray: a hash of its 32-bit float patterns. The exact compare in `#holds` settles a clash. */
  #setOf(origin: Vector3, direction: Vector3): number {
    const floats = this.#floats;
    const words = this.#words;
    floats[0] = origin.x;
    floats[1] = origin.y;
    floats[2] = origin.z;
    floats[3] = direction.x;
    floats[4] = direction.y;
    floats[5] = direction.z;
    let hash = 0;
    for (let i = 0; i < 6; i++) {
      hash = Math.imul(hash ^ (words[i] ?? 0), 0x9e3779b1);
      hash ^= hash >>> 15;
    }
    return (hash >>> 0) % SETS;
  }

  #holds(slot: number, origin: Vector3, direction: Vector3): boolean {
    const keys = this.#keys;
    const at = slot * 6;
    return (
      keys[at] === origin.x &&
      keys[at + 1] === origin.y &&
      keys[at + 2] === origin.z &&
      keys[at + 3] === direction.x &&
      keys[at + 4] === direction.y &&
      keys[at + 5] === direction.z
    );
  }
}
