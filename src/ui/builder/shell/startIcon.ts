import { iconSvg, type WaIconName } from '../wa/waIcons';

/**
 * The inline SVG of icon `name` for the `start` slot of a `wa-button`, so the icon sits before the label instead of
 * being read as part of it. The slot is added here and not in `wa/`, which stays the package boundary and knows no
 * builder layout.
 */
export function startIcon(name: WaIconName): string {
  return iconSvg(name).replace('<svg ', '<svg slot="start" ');
}
