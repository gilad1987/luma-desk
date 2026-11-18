import type { Vec3 } from './types';

/**
 * A fixture `<Color>` of an MVR file. Spec (MVR 1.6): "A color assigned to a fixture. If it is not defined, there is
 * no color for the fixture."
 */
export interface MvrFileColor {
  /** The file's value, CIE 1931 `x,y,Y`, with Y from 0 to 100. */
  readonly xyY: Vec3;
  /** The same colour as linear sRGB from 0 to 1, moved to the nearest edge of the sRGB gamut when outside it. */
  readonly rgb: Vec3;
}

/** A `<Position>` or a `<Class>` of the file's `<AUXData>` that a fixture refers to. */
export interface MvrAuxName {
  /** The reference as the fixture writes it. */
  readonly uuid: string;
  /** The `name` of the node; absent for a dangling reference, which names a node the file does not have. */
  readonly name?: string;
}

/**
 * What the `<Fixture>` element says about how the designer drew the fixture (MVR 1.6, Table 26). Every field is
 * absent when the file does not give it, so a show saved before these fields existed has the same shape. A rig
 * repeats a few colours, command lists, positions and classes on hundreds of fixtures, so a fixture stores an index
 * into a table of the design (`MvrDesignFileData`) and the design holds each value once.
 */
export interface MvrFixtureFileData {
  /** `<Color>`: an index into `colors`. */
  readonly color?: number;
  /** `<CustomCommands>`: an index into `commandSets`. */
  readonly commands?: number;
  /** `<Position>`, the hanging position the fixture belongs to: an index into `positions`. */
  readonly position?: number;
  /** `<Classing>`, the fixture's class: an index into `classes`. */
  readonly classing?: number;
  /** `<Function>`: "The name of the purpose this Fixture has." */
  readonly fixtureFunction?: string;
  /** `<DMXInvertPan>` true: "all Pan Channels of the fixture should be DMX Inverted". */
  readonly dmxInvertPan?: true;
  /** `<DMXInvertTilt>` true: "all Tilt Channels of the fixture should be DMX Inverted". */
  readonly dmxInvertTilt?: true;
  /** `<CastShadow>` as the file states it: "Defines if a Object cast Shadows." */
  readonly castShadow?: boolean;
}

/** The tables the fixtures' file data points into, each in the order the fixtures first use its entries. */
export interface MvrDesignFileData {
  readonly colors?: readonly MvrFileColor[];
  /**
   * The distinct `<CustomCommand>` lists, each raw and in file order: "the command that will be executed on the
   * fixture". The desk reads pan and tilt from them (`parseCustomCommand`) and keeps the others.
   */
  readonly commandSets?: readonly (readonly string[])[];
  readonly positions?: readonly MvrAuxName[];
  readonly classes?: readonly MvrAuxName[];
}

/** The file colour of a fixture, or `undefined` when it has none or its index is outside the table. */
export function fileColorOf(design: MvrDesignFileData, fixture: MvrFixtureFileData): MvrFileColor | undefined {
  return fixture.color === undefined ? undefined : design.colors?.[fixture.color];
}

/** The raw custom commands of a fixture in file order; empty when it has none. */
export function fileCommandsOf(design: MvrDesignFileData, fixture: MvrFixtureFileData): readonly string[] {
  return (fixture.commands === undefined ? undefined : design.commandSets?.[fixture.commands]) ?? [];
}

/** The name of a fixture's hanging position; `undefined` for no reference and for a dangling one. */
export function positionNameOf(design: MvrDesignFileData, fixture: MvrFixtureFileData): string | undefined {
  return fixture.position === undefined ? undefined : design.positions?.[fixture.position]?.name;
}

/** The name of a fixture's class; `undefined` for no reference and for a dangling one. */
export function classNameOf(design: MvrDesignFileData, fixture: MvrFixtureFileData): string | undefined {
  return fixture.classing === undefined ? undefined : design.classes?.[fixture.classing]?.name;
}
