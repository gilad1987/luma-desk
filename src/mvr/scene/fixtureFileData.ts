import { childElement, childElements, childText } from '../xml/elements';

/**
 * The children of a `<Fixture>` (MVR 1.6, Table 26) that say how the designer drew it, as the file states them. Every
 * field is absent when the file has no such child: the spec gives none of them a default.
 */
export interface FixtureFileData {
  /**
   * `<Color>`, raw. Spec: "A color assigned to a fixture. If it is not defined, there is no color for the fixture."
   * Type CIE Color: "CIE 1931 xyY absolute color point. Formatted as three Floats `x,y,Y`".
   */
  readonly color?: string;
  /**
   * Every `<CustomCommand>` of `<CustomCommands>`, in file order, raw. Spec: "The Custom command contains the command
   * that will be executed on the fixture." The spec example is `Body_Pan,f 50`; `parseCustomCommand` reads the text.
   */
  readonly customCommands?: readonly string[];
  /** `<Position>`: "A position reference that this lighting fixture belongs to if this reference exists." A uuid. */
  readonly position?: string;
  /** `<Classing>`: "The Class the object belongs to." A uuid of a `<Class>` in `<AUXData>`. */
  readonly classing?: string;
  /** `<Function>`: "The name of the purpose this Fixture has." */
  readonly fixtureFunction?: string;
  /** `<DMXInvertPan>` when true: "Defines of all Pan Channels of the fixture should be DMX Inverted." */
  readonly dmxInvertPan?: true;
  /** `<DMXInvertTilt>` when true: "Defines of all Tilt Channels of the fixture should be DMX Inverted." */
  readonly dmxInvertTilt?: true;
  /** `<CastShadow>`: "Defines if a Object cast Shadows." Kept as stated, true or false: the spec gives no default. */
  readonly castShadow?: boolean;
}

/** MVR Bool: "When representing `true` inidcate with true, when `false` indicate with false." Other text is none. */
function readBool(el: Element, tag: string): boolean | undefined {
  const text = childText(el, tag)?.toLowerCase();
  if (text === 'true') return true;
  return text === 'false' ? false : undefined;
}

/** The text of a child, or `undefined` when it is absent or empty: an empty reference or name states nothing. */
function readText(el: Element, tag: string): string | undefined {
  return childText(el, tag) || undefined;
}

/** The raw command texts; an empty `<CustomCommand/>` holds no command, so it is not kept. */
function readCommands(el: Element): readonly string[] {
  const list = childElement(el, 'CustomCommands');
  const texts = (list ? childElements(list, 'CustomCommand') : []).map((command) => command.textContent?.trim() ?? '');
  return texts.filter((text) => text !== '');
}

/** Reads the drawing data of an element (a `<Fixture>`); only the facts the file gives are in the result. */
export function readFixtureFileData(el: Element): FixtureFileData {
  const facts = {
    color: readText(el, 'Color'),
    position: readText(el, 'Position'),
    classing: readText(el, 'Classing'),
    fixtureFunction: readText(el, 'Function'),
    dmxInvertPan: readBool(el, 'DMXInvertPan') || undefined,
    dmxInvertTilt: readBool(el, 'DMXInvertTilt') || undefined,
    castShadow: readBool(el, 'CastShadow'),
  };
  const customCommands = readCommands(el);
  const given = Object.entries(facts).filter(([, value]) => value !== undefined);
  return {
    ...(Object.fromEntries(given) as FixtureFileData),
    ...(customCommands.length > 0 ? { customCommands } : {}),
  };
}
