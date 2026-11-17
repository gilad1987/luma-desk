/**
 * The named colours as [name, r, g, b] in percent. One list feeds the default Color presets, the colour pad and the
 * auto-show, so they always offer the same colours in the same order.
 */
export const COLORS: readonly (readonly [name: string, r: number, g: number, b: number])[] = [
  ['White', 100, 100, 100],
  ['Warm', 100, 80, 55],
  ['CTO', 100, 58, 22],
  ['Red', 100, 0, 0],
  ['Orange', 100, 32, 0],
  ['Amber', 100, 52, 0],
  ['Yellow', 100, 88, 0],
  ['Lime', 55, 100, 0],
  ['Green', 0, 100, 8],
  ['Cyan', 0, 100, 100],
  ['Lt Blue', 25, 65, 100],
  ['Blue', 0, 12, 100],
  ['Congo', 28, 0, 100],
  ['Lavender', 62, 40, 100],
  ['Magenta', 100, 0, 100],
  ['Pink', 100, 22, 55],
];
