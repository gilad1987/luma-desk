import type { MvrLayer } from '../../../domain/stage/mvr';
import { createElement } from '../../shared';
import { LED_GENERATED } from './ledWallsRow';

/** The two boxes of one layer row. */
export interface LayerBoxes {
  /** Checked while the layer is drawn. */
  readonly box: HTMLInputElement;
  /** Checked while the layer is marked as an LED wall. */
  readonly led: HTMLInputElement;
}

const LED_TIP = `Draw the meshes of this layer as an LED wall. Use it when the file does not say that the layer is one. ${LED_GENERATED}.`;

/**
 * One layer row: a checkbox and the layer name as text (`dir="auto"` because names are Hebrew or Latin), then the
 * "LED" box that marks the layer as an LED wall. The file often holds an LED wall as a plain solid on a layer named
 * after it, which is no evidence, so the user decides. A click on the word LED sets the LED box, not the first box
 * of the row, which a label would set.
 */
export function layerRow(
  host: HTMLElement,
  layer: MvrLayer,
  hidden: readonly string[],
  marked: readonly string[],
): LayerBoxes {
  const row = createElement('label', 'mvrLayer');
  row.dir = 'auto';
  const box = createElement('input');
  box.type = 'checkbox';
  box.checked = !hidden.includes(layer.uuid);
  const name = createElement('span');
  name.textContent = layer.name;
  const led = createElement('input', 'mvrLayerLed');
  led.type = 'checkbox';
  led.title = LED_TIP;
  led.checked = marked.includes(layer.uuid);
  const word = createElement('span', 'mvrLayerLedWord');
  word.textContent = 'LED';
  word.title = LED_TIP;
  word.onclick = (event) => {
    event.preventDefault();
    led.click();
  };
  for (const part of [box, name, led, word]) row.appendChild(part);
  host.appendChild(row);
  return { box, led };
}
