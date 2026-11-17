import { clamp, hsv } from '../../../core';
import type { Programmer } from '../../../engine/Programmer';
import { boxMap, pointerDrag, type BoxMap } from '../../shared';

/** Paints the hue (x) by saturation (y, full at the top) field, one `fillRect` per pixel (quirk Q21). */
function paintHueField(c: HTMLCanvasElement): void {
  const x = c.getContext('2d');
  if (!x) throw new Error('color pad: no 2D canvas context');
  for (let px = 0; px < c.width; px++)
    for (let py = 0; py < c.height; py++) {
      const [r, g, b] = hsv(px / c.width, 1 - py / c.height, 1);
      // 0..1 channels times 255, not cssRgb: `0.5 * 255` and `50 * 2.55` differ in float (hotspot H4)
      x.fillStyle = `rgb(${r * 255},${g * 255},${b * 255})`;
      x.fillRect(px, py, 1, 1);
    }
}

/**
 * Turns `c` into a colour picker: a click or drag sets full-value hue and saturation on the colour targets, which
 * are fixed at pointer-down. Without colour targets it does not capture. Used in `#encExtra` and on `#tsCol`.
 */
export function colorPad(c: HTMLCanvasElement, programmer: Programmer): void {
  paintHueField(c);
  let pickIds: number[] = [],
    map: BoxMap | undefined;
  const pick = (ev: PointerEvent): void => {
    if (!map) return;
    const [u, v] = map(ev);
    const [r, g, b] = hsv(clamp(u, 0, 1), clamp(1 - v, 0, 1), 1);
    pickIds.forEach((id) => {
      programmer.set(id, 'r', r * 100);
      programmer.set(id, 'g', g * 100);
      programmer.set(id, 'b', b * 100);
    });
  };
  pointerDrag(c, {
    accept: () => {
      pickIds = programmer.colorTargets();
      return pickIds.length > 0;
    },
    start: (ev) => {
      map = boxMap(c);
      pick(ev);
    },
    move: pick,
  });
}
