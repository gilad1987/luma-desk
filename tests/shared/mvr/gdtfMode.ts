/**
 * One `<DMXMode>` for `makeGdtf`, holding the given channels. Each channel is `Attribute` plus raw extra XML
 * attributes (`Offset="1" DMXBreak="2" Geometry="Pixel"`), so a test shows only what it checks.
 */
export function gdtfMode(name: string, channels: readonly (readonly [string, string])[], geometry = 'Body'): string {
  const body = channels
    .map(([attribute, extra]) => `<DMXChannel ${extra}><LogicalChannel Attribute="${attribute}"/></DMXChannel>`)
    .join('');
  return `<DMXMode Name="${name}" Geometry="${geometry}"><DMXChannels>${body}</DMXChannels></DMXMode>`;
}
