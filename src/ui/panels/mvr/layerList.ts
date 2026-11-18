import type { MvrLayer } from '../../../domain/stage/mvr';
import { audienceRow, type AudienceControl } from './audienceRow';
import { hallRow, type HallControl } from './hallRow';
import { layerRow } from './layerRow';
import { ledWallsRow, type LedWallsControl } from './ledWallsRow';
import { proxiesRow } from './proxiesRow';

/** The layers marked as LED walls, and how to set them. */
export interface MarkLed {
  readonly marked: readonly string[];
  /** Sets the marked layers and resolves with the LED controls the stage has after it; none without a wall. */
  readonly set: (uuids: readonly string[]) => Promise<LedWallsControl | undefined>;
}

/** What the layer list shows; the import summary and the "Layers" dialog of the top bar build the same list. */
export interface MvrLayerListContent {
  /** The layers of the file, in file order; one checkbox each. */
  readonly layers: readonly MvrLayer[];
  /** The uuids of the layers the design hides; their boxes start unchecked. */
  readonly hiddenLayers: readonly string[];
  /** Present when the stage draws proxies: the list then has a "Show proxies" box that calls it. */
  readonly showProxies?: ((shown: boolean) => void) | undefined;
  /** Whether the proxies are drawn now; missing means drawn, as on a fresh import. */
  readonly proxiesShown?: boolean | undefined;
  /** Present when the stage draws seat proxies: the desk's audience on them gets its row. */
  readonly audience?: AudienceControl | undefined;
  /** Present for a stage that may get the desk-made hall: the row turns it off and says where the hall comes from. */
  readonly hall?: HallControl | undefined;
  /** Present when the stage has LED walls or a marked layer: the level and look rows and the notes on top. */
  readonly ledWalls?: LedWallsControl | undefined;
  /** Every layer row then reports its "LED" box. */
  readonly markLed?: MarkLed | undefined;
}

/**
 * Fills `host` with the layer list. Every box change reports the full list of hidden layer uuids, so the caller saves
 * and shows one consistent state. A change of an "LED" box reports the marked layers; when the first mark brings the
 * LED controls, or the last one takes them away, the list is built again with the boxes as they stand, so the note
 * that the desk generates the content is in view from the first mark on. The focus goes back to the box of that row.
 * It returns the "LED" boxes in row order.
 */
export function fillLayerList(
  host: HTMLElement,
  content: MvrLayerListContent,
  onHiddenLayers: (uuids: readonly string[]) => void,
): HTMLInputElement[] {
  if (content.ledWalls) ledWallsRow(host, content.ledWalls);
  const proxies = content.showProxies ? proxiesRow(host, content.showProxies, content.proxiesShown) : undefined;
  const { marked = [], set } = content.markLed ?? {};
  const rows = content.layers.map((layer) => ({ layer, ...layerRow(host, layer, content.hiddenLayers, marked) }));
  const uuids = (picked: (row: (typeof rows)[number]) => boolean): string[] =>
    rows.filter(picked).map((row) => row.layer.uuid);
  const hiddenNow = (): string[] => uuids((row) => !row.box.checked);
  const markedNow = (): string[] => uuids((row) => row.led.checked);
  const follow = (ledWalls: LedWallsControl | undefined, index: number): void => {
    if ((ledWalls === undefined) === (content.ledWalls === undefined)) return;
    const markLed = content.markLed && { ...content.markLed, marked: markedNow() };
    const next = { ...content, hiddenLayers: hiddenNow(), proxiesShown: proxies?.checked, ledWalls, markLed };
    host.replaceChildren();
    fillLayerList(host, next, onHiddenLayers)[index]?.focus();
  };
  // the hall row stands after the layers, and its line follows their boxes: a shown hall layer takes the desk's away
  const hall = content.hall ? hallRow(host, content.hall, hiddenNow) : undefined;
  rows.forEach(({ box, led }, index) => {
    box.onchange = () => {
      onHiddenLayers(hiddenNow());
      hall?.();
    };
    led.onchange = () => void set?.(markedNow()).then((control) => follow(control, index));
  });
  if (content.audience) audienceRow(host, content.audience, hiddenNow);
  return rows.map((row) => row.led);
}
