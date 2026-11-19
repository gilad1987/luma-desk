/**
 * One `<CustomCommand>` of an MVR fixture, read by the grammar the specs give.
 *
 * MVR 1.6, CustomCommand: "The Custom command contains the command that will be executed on the fixture. The
 * definition from the syntax for the command aligns with the DIN SPEC 15800:2022-02, 11.2.1.2.3, Channel Functions,
 * for command based control systems." Its example: `<CustomCommand>Body_Pan,f 50</CustomCommand>`.
 *
 * GDTF, Channel Function: "For command based control systems, you can control the fixture by sending it a string in
 * the following style: `"/FIXTURE_ID/CUSTOM_NAME_CHANNELFUCTION ,f FLOAT_VALUE_PHYSICAL"`" and
 * `"/FIXTURE_ID/CUSTOM_NAME_CHANNELFUCTION/percent ,f FLOAT_VALUE_PERCENT"`. `CustomName`: "Default: Node Name of the
 * Channel function Example: Head_Dimmer.Dimmer.Dimmer".
 */
export interface MvrCommand {
  /** The custom name of the channel function, without a fixture id path: `Body_Pan`, `Head_Dimmer.Dimmer.Dimmer`. */
  readonly name: string;
  /** The float after `,f`: a physical value of the function, or a percentage of its range when `percent`. */
  readonly value: number;
  /** True for the `/percent` form. */
  readonly percent: boolean;
}

/**
 * `,f <float>` after the last comma of `<name> ,f <float>`; the MVR example has no space before the comma, the GDTF
 * style has one. The text is split at the last comma, not by one pattern over the whole text: a lazy name before
 * `\s*` tried every split and took seconds on a long run of spaces. A float holds no comma, so the last comma is the
 * one before `f`.
 */
const TAIL = /^,\s*f\s+(\S+)$/;
/** A command is one line of text: a name that holds a line break (Zl, Zp: U+2028, U+2029) is no command name. */
const LINE_BREAK = /[\n\r\p{Zl}\p{Zp}]/u;

/** Reads a command text; `undefined` for text that is not `name ,f float`, which the caller keeps and counts. */
export function parseCustomCommand(text: string): MvrCommand | undefined {
  const trimmed = text.trim();
  const comma = trimmed.lastIndexOf(',');
  const match = comma < 0 ? null : TAIL.exec(trimmed.slice(comma));
  const value = Number(match?.[1]);
  const path = trimmed.slice(0, Math.max(comma, 0)).trimEnd();
  if (!match || !Number.isFinite(value) || LINE_BREAK.test(path)) return undefined;
  // "/FIXTURE_ID/NAME[/percent]": a path that starts with "/" starts with the sender's address of the fixture. GDTF:
  // "Note that all "." Separators can be replaced with "/"", so the parts after the id are the parts of the name
  // (`/7/Body_Pan/Pan/Pan 1` is `Body_Pan.Pan.Pan 1`), and the name is kept in its dotted form.
  const parts = path.split('/').filter((part) => part !== '');
  const percent = parts.length > 1 && parts[parts.length - 1] === 'percent';
  const named = percent ? parts.slice(0, -1) : parts;
  const name = (path.startsWith('/') && named.length > 1 ? named.slice(1) : named).join('.');
  return name === '' ? undefined : { name, value, percent };
}

/**
 * Whether a command drives Pan or Tilt. The default custom name is `Channel.LogicalChannel.Function`, and a logical
 * channel has the name of its attribute, so the second part of a dotted name is the attribute. A one-part name (the
 * MVR example `Body_Pan`, `Yoke_Tilt`) is the channel name `Geometry_Attribute`; geometry names may hold `_`, so
 * only the ending tells. A custom name the fixture's maker chose freely is no axis here.
 */
export function commandAxis(command: MvrCommand): 'pan' | 'tilt' | undefined {
  const [channel = '', logical] = command.name.split('.');
  const attribute = logical ?? channel.slice(channel.lastIndexOf('_') + 1);
  if (attribute === 'Pan') return 'pan';
  return attribute === 'Tilt' ? 'tilt' : undefined;
}
