import { boundsOf } from '../../../domain/stage/bounds';
import type { StageDesign } from '../../../domain/stage/StageDesign';
import { fitTransform, type CanvasSize, type PlanTransform } from './planTransform';

/**
 * The fit of the draft into the canvas, made again only when the draft object or the canvas size changed. The view
 * paints on every drag frame, the draft does not change during a drag (the preview is drawn, not fitted), and
 * `boundsOf` walks every truss, fixture and riser.
 */
export class PlanFit {
  #draft: StageDesign | null = null;
  #width = 0;
  #height = 0;
  #transform: PlanTransform | null = null;

  /** The transform that fits `draft` into `size`; the last one when neither changed. */
  of(draft: StageDesign, size: CanvasSize): PlanTransform {
    const same = draft === this.#draft && size.width === this.#width && size.height === this.#height;
    if (this.#transform && same) return this.#transform;
    this.#draft = draft;
    this.#width = size.width;
    this.#height = size.height;
    this.#transform = fitTransform(boundsOf(draft), size);
    return this.#transform;
  }
}
