import type { Clock } from '../../../core';
import type { Fixture } from '../../../domain/Fixture';
import type { EngineBus } from '../../../engine/events';
import type { Selection } from '../../../engine/Selection';
import type { FixturePicker } from '../../../render/FixturePicker';

/** What viewport picking needs: the stage canvas, the render picker, the fixtures and the selection it changes. */
export interface ViewportDeps {
  readonly canvas: HTMLCanvasElement;
  readonly picker: Pick<FixturePicker, 'pickAt' | 'projectToScreen'>;
  /** In build order; a box select sorts its own result by id. */
  readonly fixtures: readonly Fixture[];
  readonly selection: Selection;
  readonly bus: EngineBus;
  /** The orbit controls; a box drag turns them off so the camera holds still under the rectangle. */
  readonly controls: { enabled: boolean };
  readonly clock: Clock;
}
