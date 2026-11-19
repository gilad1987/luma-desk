import { createElement } from '../../shared';

/** The audience choice of the summary: drawn or not, and the share of seats that are taken (0 to 1). */
export interface AudienceChoice {
  readonly shown: boolean;
  readonly occupancy: number;
}

/** What the audience row needs from the app. Counts leave out the seat layers whose uuids are in `hidden`. */
export interface AudienceControl {
  readonly seats: (hidden: readonly string[]) => number;
  readonly figures: (occupancy: number, hidden: readonly string[]) => number;
  readonly onChange: (choice: AudienceChoice) => void;
  /** The last choice reported for this stage, so a row made again starts from it; undefined before the first. */
  readonly choice: () => AudienceChoice | undefined;
  /** Resolves false when no audience was built for the stage (its code did not load): the row then says so. */
  readonly built: Promise<boolean>;
}

const SHARES = [0, 50, 85, 100] as const;
const DEFAULT_SHARE = 85;
const count = (n: number): string => n.toLocaleString('en-US');
export const AUDIENCE_NOT_LOADED = 'The audience could not be loaded; no audience figures are shown.';

/**
 * The summary line of the audience. It says in every state that the figures come from the desk and not from the
 * file, so nobody takes the people in the picture for data of the MVR.
 */
export function audienceLine(figures: number, seats: number): string {
  const on = `${count(seats)} ${seats === 1 ? 'seat' : 'seats'}`;
  if (figures === 0) return `No audience figures are shown on ${on}; the file has no audience.`;
  if (figures === 1) return `1 audience figure is added by the desk on ${on}; it is not in the file.`;
  return `${count(figures)} audience figures are added by the desk on ${on}; they are not in the file.`;
}

/** The occupancy choice, set to `selected` (%). */
function shareSelect(selected: number): HTMLSelectElement {
  const share = createElement('select');
  share.id = 'mvrAudienceShare';
  for (const percent of SHARES) {
    const option = createElement('option');
    option.value = String(percent);
    option.textContent = `${percent} %`;
    option.selected = percent === selected;
    share.appendChild(option);
  }
  return share;
}

/**
 * The "Audience" row of the layer list, after "Show proxies": a box, the occupancy and the summary line. The figures
 * sit on seat proxies of shown layers: the row is off while the proxies are hidden, and the line counts the layers
 * that `hidden` (the uuids of the unchecked layers now) leaves. Any change in `host` words the line again. The row
 * starts from the last choice of the stage (`control.choice`), on at 85 % before the first: an occupancy change of
 * a row made again then keeps an audience that was turned off. The labels are English inline, like the other summary
 * labels.
 */
export function audienceRow(host: HTMLElement, control: AudienceControl, hidden: () => readonly string[]): HTMLElement {
  const last = control.choice();
  const row = createElement('label', 'mvrLayer');
  const box = createElement('input');
  box.type = 'checkbox';
  box.id = 'mvrAudience';
  box.checked = last?.shown ?? true;
  const name = createElement('span');
  name.textContent = 'Audience';
  const share = shareSelect(last ? Math.round(last.occupancy * 100) : DEFAULT_SHARE);
  const note = createElement('div');
  note.id = 'mvrAudienceNote';
  const proxies = host.querySelector<HTMLInputElement>('#mvrShowProxies');
  let built = true;
  const update = (report: boolean): void => {
    const drawn = built && proxies?.checked !== false;
    box.disabled = share.disabled = !drawn;
    const choice = { shown: box.checked, occupancy: Number(share.value) / 100 };
    const figures = drawn && choice.shown ? control.figures(choice.occupancy, hidden()) : 0;
    note.textContent = built ? audienceLine(figures, control.seats(hidden())) : AUDIENCE_NOT_LOADED;
    if (report) control.onChange(choice);
  };
  host.addEventListener('change', ({ target }) => update(target === box || target === share));
  row.append(box, name, share);
  // The row belongs under "Show proxies"; the layer rows that follow were made before it.
  const above = proxies?.closest('label');
  if (above) above.after(row, note);
  else host.prepend(row, note);
  update(false);
  void control.built.then((ok) => {
    built = ok;
    update(false);
  });
  return note;
}
