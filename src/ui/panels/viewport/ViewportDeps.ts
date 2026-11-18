import type { Camera } from 'three';
import type { Clock } from '../../../core';
import type { Fixture } from '../../../domain/Fixture';
import type { EngineBus } from '../../../engine/events';
import type { Selection } from '../../../engine/Selection';
import type { FixturePicker } from '../../../render/picking/FixturePicker';

/**
 * What viewport picking needs: the stage canvas, the render picker, the stage camera (the box select projects
 * fixtures through it), the fixtures and the selection it changes.
 */
export interface ViewportDeps {
  readonly canvas: HTMLCanvasElement;
  readonly picker: Pick<FixturePicker, 'pickAt'>;
  readonly camera: Camera;
  /** In build order; a box select sorts its own result by id. */
  readonly fixtures: readonly Fixture[];
  readonly selection: Pick<Selection, 'set'>;
  readonly bus: EngineBus;
  /** The orbit controls; a box drag turns them off so the camera holds still under the rectangle. */
  readonly controls: { enabled: boolean };
  readonly clock: Clock;
  /**
   * True while the Stage Builder is open. The view then shows the preview rig, and a fixture picked there could be a
   * preview-only id that stays selected after Cancel, so a release selects nothing.
   */
  readonly isBuilding: () => boolean;
}
