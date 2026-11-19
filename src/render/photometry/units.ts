/**
 * Photometric quantities as branded numbers. A brand costs nothing at run time, and the compiler then refuses a lux
 * value where candela are expected, so the wiring of the renderer cannot mix the units without a visible conversion.
 * Arithmetic on a branded value gives a plain `number`: a result gets its unit from the function that returns it.
 */
type Quantity<Unit extends string> = number & { readonly __unit: Unit };

/** Luminous flux in lumens (lm): all the visible light a source emits. GDTF `LuminousFlux` is in this unit. */
export type Lumens = Quantity<'lm'>;
/** Luminous intensity in candela (cd = lm / sr): the flux per solid angle in one direction. */
export type Candela = Quantity<'cd'>;
/** Illuminance in lux (lx = lm / m2): the flux that arrives on a surface per area. */
export type Lux = Quantity<'lx'>;
/** Luminance in nits (cd / m2): what a camera or an eye receives from a surface, a lens or the haze. */
export type Nits = Quantity<'cd/m2'>;

/**
 * NaN reads as 0, no light (see `finiteOr`). Infinity stays: a caller may mean "no limit" by it (`nits(Infinity)`
 * as the cap of `lensLuminance`), and each public function keeps its own result finite.
 */
function noNaN(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

/** Marks a plain number as lumens. NaN reads as 0. */
export function lumens(value: number): Lumens {
  return noNaN(value) as Lumens;
}

/** Marks a plain number as candela. NaN reads as 0. */
export function candela(value: number): Candela {
  return noNaN(value) as Candela;
}

/** Marks a plain number as lux. NaN reads as 0. */
export function lux(value: number): Lux {
  return noNaN(value) as Lux;
}

/** Marks a plain number as nits. NaN reads as 0. */
export function nits(value: number): Nits {
  return noNaN(value) as Nits;
}
