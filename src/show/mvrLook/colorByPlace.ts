import type { Fixture } from '../../domain/Fixture';
import type { NamedColor } from '../../engine/colorByName';
import type { PresetFn } from '../../engine/positionPresets';

/**
 * A fixture's place with its side dropped, to the millimetre: a fixture and its mirror image on the other side share
 * it even when an imported file places them with float noise.
 */
const mirroredPlace = (f: Fixture): string => `${Math.round(Math.abs(f.pos.x) * 1000)}|${Math.round(f.pos.y * 1000)}`;

/**
 * The colour of each mirrored place of `fixtures`, cycling through `palette` from the centre line outwards and, at
 * one distance, from low to high. It ranks places, not fixtures, so a fixture and its mirror image get the same colour
 * even when one side holds more fixtures than the other, and each colour takes about an equal share of the places.
 */
export function colorByPlaceOf(fixtures: readonly Fixture[], palette: readonly NamedColor[]): PresetFn {
  const ordered = [...fixtures].sort((a, b) => Math.abs(a.pos.x) - Math.abs(b.pos.x) || a.pos.y - b.pos.y);
  const ranks = new Map<string, number>();
  for (const f of ordered) if (!ranks.has(mirroredPlace(f))) ranks.set(mirroredPlace(f), ranks.size);
  return (f) => {
    const k = ranks.get(mirroredPlace(f)) ?? 0;
    const color = palette[k % palette.length];
    if (color === undefined) throw new RangeError(`MVR first look: no colour for place ${k}`);
    return { ...color };
  };
}
