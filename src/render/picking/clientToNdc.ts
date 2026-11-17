import type { Vector2 } from 'three';
import type { ScreenRect } from '../shared';

/** Maps a client pixel inside a rect to normalised device coordinates (-1..1, y up), the raycaster's input. */
export function clientToNdc(clientX: number, clientY: number, rect: ScreenRect, out: Vector2): Vector2 {
  return out.set(((clientX - rect.left) / rect.width) * 2 - 1, (-(clientY - rect.top) / rect.height) * 2 + 1);
}
