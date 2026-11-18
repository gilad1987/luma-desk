/**
 * The upper half (bytes 0x80 to 0xFF) of IBM code page 437, the encoding the ZIP format gives a file name that does
 * not set the UTF-8 flag. The lower half is ASCII. The last character is the no-break space.
 */
const UPPER =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
  'áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
  '└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
  'αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00a0';

/** Decodes bytes as code page 437: what a ZIP name without the UTF-8 flag means when it is not valid UTF-8. */
export function cp437(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += byte < 0x80 ? String.fromCharCode(byte) : UPPER.charAt(byte - 0x80);
  return text;
}
