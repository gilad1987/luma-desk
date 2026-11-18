/** A class list over a Set, enough for the toggles the components make. */
export class FakeClassList {
  readonly tokens = new Set<string>();
  add = (t: string): void => void this.tokens.add(t);
  remove = (t: string): void => void this.tokens.delete(t);
  contains = (t: string): boolean => this.tokens.has(t);
  toggle = (t: string, force?: boolean): boolean => {
    const on = force ?? !this.tokens.has(t);
    if (on) this.tokens.add(t);
    else this.tokens.delete(t);
    return on;
  };
}
