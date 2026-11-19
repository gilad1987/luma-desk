/** GDTF `DMXValue`: `Uint/n` (byte mirroring) or `Uint/ns` (byte shifting), `n` being the byte count. */
const DMX_VALUE = /^\s*(\d+)\s*\/\s*([1-4])(s?)\s*$/;

/** The byte count a `DMXValue` text names (`2` in `32768/2`); `undefined` when the text is not a DMX value. */
export function dmxValueBytes(text: string | undefined): number | undefined {
  const count = DMX_VALUE.exec(text ?? '')?.[2];
  return count === undefined ? undefined : Number(count);
}

/** `value` of `own` bytes written with `target` bytes by repeating its bytes: 0x12 becomes 0x1212. */
function mirror(value: number, own: number, target: number): number {
  let out = 0;
  for (let index = 0; index < target; index += 1) {
    out = out * 256 + (Math.floor(value / 256 ** (own - 1 - (index % own))) % 256);
  }
  return out;
}

/**
 * A GDTF `DMXValue` in the resolution of a channel of `bytes` bytes. The spec: "The byte count can be individually
 * specified without depending on the resolution of the DMX Channel. By default byte mirroring is used for the
 * conversion. So 255/1 in a 16 bit channel will result in 65535." A value with more bytes than the channel keeps its
 * most significant bytes. `undefined` for a text that is not a DMX value (`None`) or that does not fit its own bytes.
 */
export function parseDmxValue(text: string | undefined, bytes: number): number | undefined {
  const match = DMX_VALUE.exec(text ?? '');
  if (match === null) return undefined;
  const value = Number(match[1]);
  const own = Number(match[2]);
  if (!Number.isFinite(value) || value > 256 ** own - 1) return undefined;
  if (bytes === own) return value;
  if (bytes < own) return Math.floor(value / 256 ** (own - bytes));
  return match[3] === 's' ? value * 256 ** (bytes - own) : mirror(value, own, bytes);
}
