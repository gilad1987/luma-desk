/** The style fields the components write; custom properties land in `custom`. */
export class FakeStyle {
  cssText = '';
  display = '';
  height = '';
  width = '';
  bottom = '';
  transform = '';
  readonly custom = new Map<string, string>();
  setProperty = (name: string, value: string): void => void this.custom.set(name, value);
}
