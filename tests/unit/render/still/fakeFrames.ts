/** A manual frame clock: `schedule` queues a step, `runFrame` runs the queued one. */
export class FakeFrames {
  time = 0;
  private queued = new Map<number, () => void>();
  private nextId = 1;
  readonly schedule = (step: () => void): number => {
    this.queued.set(this.nextId, step);
    return this.nextId++;
  };
  readonly unschedule = (id: number): void => {
    this.queued.delete(id);
  };
  readonly now = (): number => this.time;
  get pending(): number {
    return this.queued.size;
  }
  runFrame(): void {
    const [entry] = this.queued;
    if (!entry) throw new Error('no frame is queued');
    this.queued.delete(entry[0]);
    entry[1]();
  }
}
