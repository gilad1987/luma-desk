/**
 * The height above the floor (or the stage deck) that focus pads aim at, in metres. One instance is shared: the
 * Position extras slider writes it, and both the `#encExtra` pad and the MA touch-screen pad read it at each aim.
 */
export class AimHeight {
  value = 1.4;
}
