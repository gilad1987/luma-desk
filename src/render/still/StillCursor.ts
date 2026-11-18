import { stillProgress } from './stillProgress';
import type { StillProgress, StillState, StillWork } from './StillWork';

/** The phases in which the render is still running. */
export const ACTIVE_STATES: readonly StillState[] = ['preparing', 'rendering', 'resolving', 'encoding'];

/**
 * Where a still render is and what its next synchronous step is. The controller decides when steps run; this
 * class decides which step comes next and moves the state on.
 */
export class StillCursor<O> {
  state: StillState = 'idle';
  private tile = 0;
  private sample = 0;
  private samplesDone = 0;
  private renderMs = 0;
  private stripsRead = false;

  private readonly work: StillWork<O>;
  private readonly now: () => number;

  constructor(work: StillWork<O>, now: () => number) {
    this.work = work;
    this.now = now;
  }

  /** True while a synchronous step is left; false once the strips are read and only the async encode remains. */
  get stepping(): boolean {
    return ACTIVE_STATES.includes(this.state) && !this.stripsRead;
  }

  get progress(): StillProgress {
    const { tiles, maxSamples } = this.work;
    const { state, tile, sample, samplesDone, renderMs } = this;
    return stillProgress({ state, tile, sample, tiles, maxSamples, samplesDone, renderMs });
  }

  /** Runs the next step; false when the work was not ready and nothing ran. */
  step(): boolean {
    const { work } = this;
    if (!work.ready()) return false;
    if (this.state === 'preparing') {
      work.prepare();
      this.state = 'rendering';
    } else if (this.state === 'rendering') this.renderStep();
    else if (this.state === 'resolving') {
      work.resolve();
      this.state = 'encoding';
    } else if (this.state === 'encoding') this.stripsRead = work.readStrip();
    return true;
  }

  private renderStep(): void {
    const { work } = this;
    const started = this.now();
    const converged = work.renderSample(this.tile, this.sample);
    this.renderMs += this.now() - started;
    this.samplesDone++;
    this.sample++;
    if (!converged && this.sample < work.maxSamples) return;
    work.finishTile(this.tile, this.sample);
    this.tile++;
    this.sample = 0;
    if (this.tile >= work.tiles) this.state = 'resolving';
  }
}
