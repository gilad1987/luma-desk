/**
 * What the repaint scheduler calls on a panel each frame. `fast` runs on the 50 ms tick for values that change every
 * frame; `slow` on the 400 ms tick, or on the next frame after `stateDirty`. A boundary, so panels never import the
 * scheduler and the scheduler never knows a panel's type.
 */
export interface UiPanel {
  fast?(now: number): void;
  slow?(): void;
}
