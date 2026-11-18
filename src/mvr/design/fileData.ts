import type { MvrAuxName, MvrDesignFileData, MvrFileColor, MvrFixtureFileData } from '../../domain/stage/mvrFileData';
import { parseColorCie, xyyToLinearSrgb } from '../gdtf/optics/cieColor';
import { uuidKey, type AuxNames } from '../scene/auxNames';
import type { FixtureFileData } from '../scene/fixtureFileData';

/** Four decimals: finer than any 8-bit colour step, and short in the saved show. */
const round = (value: number): number => Math.round(value * 1e4) / 1e4;

/** A table of distinct values: `indexOf` gives the place of a value, adding it at its first use. */
class Table<T> {
  readonly items: T[] = [];
  private readonly byKey = new Map<string, number>();

  indexOf(key: string, make: () => T): number {
    const known = this.byKey.get(key);
    if (known !== undefined) return known;
    this.byKey.set(key, this.items.length);
    return this.items.push(make()) - 1;
  }
}

/** A reference with the name of the node it finds; a dangling reference keeps its uuid and has no name. */
function auxName(uuid: string, names: ReadonlyMap<string, string> | undefined): MvrAuxName {
  const name = names?.get(uuidKey(uuid));
  return { uuid, ...(name === undefined ? {} : { name }) };
}

/**
 * Maps the file data of each `<Fixture>` to its stored form and collects the tables the fixtures share. A rig repeats
 * a few colours, command lists, positions and classes on hundreds of fixtures, so each fixture stores an index and
 * the design holds every value once.
 */
export class FileDataTables {
  private readonly aux: AuxNames | undefined;
  private readonly colors = new Table<MvrFileColor>();
  private readonly commandSets = new Table<readonly string[]>();
  private readonly positions = new Table<MvrAuxName>();
  private readonly classes = new Table<MvrAuxName>();

  constructor(aux: AuxNames | undefined) {
    this.aux = aux;
  }

  /** The table index of a `<Color>` text; `undefined` for none and for text that is no CIE `x,y,Y` colour. */
  private colorOf(text: string | undefined): number | undefined {
    const xyY = parseColorCie(text);
    if (xyY === undefined) return undefined;
    return this.colors.indexOf(xyY.join(','), () => {
      const [r, g, b] = xyyToLinearSrgb(xyY);
      return { xyY, rgb: [round(r), round(g), round(b)] };
    });
  }

  /** The stored file data of one fixture; only the facts the file gave. */
  of(record: FixtureFileData): MvrFixtureFileData {
    const { customCommands: list, position: at, classing: cls } = record;
    const { fixtureFunction, dmxInvertPan, dmxInvertTilt, castShadow } = record;
    const color = this.colorOf(record.color);
    const commands = list && this.commandSets.indexOf(JSON.stringify(list), () => list);
    const position = at === undefined ? at : this.positions.indexOf(at, () => auxName(at, this.aux?.positions));
    const classing = cls === undefined ? cls : this.classes.indexOf(cls, () => auxName(cls, this.aux?.classes));
    const facts = { color, commands, position, classing, fixtureFunction, dmxInvertPan, dmxInvertTilt, castShadow };
    const given = Object.entries(facts).filter(([, value]) => value !== undefined);
    return Object.fromEntries(given);
  }

  /** The tables for the design; a table no fixture uses is left out. */
  tables(): MvrDesignFileData {
    const tables = {
      colors: this.colors.items,
      commandSets: this.commandSets.items,
      positions: this.positions.items,
      classes: this.classes.items,
    };
    const used = Object.entries(tables).filter(([, items]) => items.length > 0);
    return Object.fromEntries(used);
  }
}
