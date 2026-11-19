/**
 * The bookings of a Builder mode open that waits for the Web Awesome chunk load. Only the newest booking may still
 * enter, and `cancel` voids them all: a Cancel during a slow load keeps the builder shut, and a double click on
 * "Build Stage" opens it once.
 */
export class OpenBooking {
  #ticket = 0;

  /** Books an open and returns the call that runs `enter`, if no later booking or `cancel` came first. */
  book(enter: () => void): () => void {
    const ticket = ++this.#ticket;
    return () => {
      if (ticket === this.#ticket) enter();
    };
  }

  /** Voids every booking made so far; an exit calls it, so a load that ends after it does not open the builder. */
  cancel(): void {
    this.#ticket += 1;
  }
}
