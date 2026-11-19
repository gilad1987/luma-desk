import { attr, childElement, childElements } from '../../xml/elements';
import type { GdtfMode } from '../GdtfInfo';
import { parseColorCie } from './cieColor';
import { compact, toNumber } from './compact';
import type { GdtfFunction } from './GdtfFunction';
import type { GdtfEmitter, GdtfOpticsSource, GdtfSlot, GdtfWheel } from './GdtfOpticsSource';
import { readBeams } from './readBeams';
import { readFunctions } from './readFunctions';

function toSlot(slot: Element): GdtfSlot {
  return compact<GdtfSlot>({
    name: attr(slot, 'Name') ?? '',
    color: parseColorCie(attr(slot, 'Color')),
    mediaFileName: attr(slot, 'MediaFileName') || undefined,
    facets: childElements(slot, 'Facet').length,
  });
}

function readWheels(fixtureType: Element): GdtfWheel[] {
  const wheels = childElement(fixtureType, 'Wheels');
  const toWheel = (wheel: Element): GdtfWheel => ({
    name: attr(wheel, 'Name') ?? '',
    slots: childElements(wheel, 'Slot').map(toSlot),
  });
  return wheels ? childElements(wheels, 'Wheel').map(toWheel) : [];
}

/** A wavelength above 0 nm; 0 or less is no wavelength, and the stored design accepts only one above 0. */
function wavelength(text: string | undefined): number | undefined {
  const value = toNumber(text);
  return value !== undefined && value > 0 ? value : undefined;
}

/** The `Emitter` or `Filter` list of the `PhysicalDescriptions`; both have a name and a `Color`. */
function readEmitters(fixtureType: Element, collect: 'Emitters' | 'Filters'): GdtfEmitter[] {
  const physical = childElement(fixtureType, 'PhysicalDescriptions');
  const list = physical && childElement(physical, collect);
  const toEmitter = (el: Element): GdtfEmitter =>
    compact<GdtfEmitter>({
      name: attr(el, 'Name') ?? '',
      color: parseColorCie(attr(el, 'Color')),
      dominantWaveLength: wavelength(attr(el, 'DominantWaveLength')),
    });
  return list ? childElements(list).map(toEmitter) : [];
}

/** Walks the modes and channels exactly as `readModes` does, so the indices of both results agree. */
function readModeFunctions(fixtureType: Element, modes: readonly GdtfMode[]): GdtfFunction[][][] {
  const collect = childElement(fixtureType, 'DMXModes');
  const modeEls = collect ? childElements(collect, 'DMXMode') : [];
  return modeEls.map((modeEl, modeIndex) => {
    const channels = childElement(modeEl, 'DMXChannels');
    const els = channels ? childElements(channels, 'DMXChannel') : [];
    return els.map((el, index) => readFunctions(el, modes[modeIndex]?.channels[index]?.offset.length ?? 0));
  });
}

/** The optical facts of a `FixtureType`. `modes` is the result of `readModes` for the same element. */
export function readOpticsSource(fixtureType: Element, modes: readonly GdtfMode[]): GdtfOpticsSource {
  const geometries = childElement(fixtureType, 'Geometries');
  return {
    functions: readModeFunctions(fixtureType, modes),
    wheels: readWheels(fixtureType),
    emitters: readEmitters(fixtureType, 'Emitters'),
    filters: readEmitters(fixtureType, 'Filters'),
    beams: geometries ? readBeams(geometries) : [],
  };
}
