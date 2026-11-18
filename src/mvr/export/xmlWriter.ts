/** The five characters XML gives a meaning; every other character, Hebrew included, is written as plain UTF-8. */
const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/**
 * Characters XML 1.0 does not allow at all (C0 controls other than tab, LF and CR, `U+FFFE`, `U+FFFF` and lone
 * surrogates). A reader rejects the whole file on one of them, so they are dropped.
 */
const ILLEGAL = new RegExp(
  [
    '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\uFFFE\\uFFFF]',
    '[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])',
    '(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]',
  ].join('|'),
  'g',
);

/** Whitespace a reader turns into a plain space in an attribute, so attributes write it as a character reference. */
const ATTRIBUTE_SPACE: Readonly<Record<string, string>> = { '\t': '&#9;', '\n': '&#10;', '\r': '&#13;' };

/**
 * Escapes text for an XML attribute or text node. Only the five special characters change and XML-illegal
 * characters are dropped, so Hebrew names stay readable in the file and a reader gets the same string back.
 */
function escapeXml(text: string): string {
  return text.replace(ILLEGAL, '').replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
}

/** Attribute name to value, written in insertion order so the output does not depend on anything but the input. */
export type XmlAttributes = Readonly<Record<string, string>>;

/** The ` name="value"` list of an element, values escaped and their tabs and line breaks kept as references. */
function attributeText(attributes: XmlAttributes): string {
  return Object.entries(attributes)
    .map(
      ([name, value]) => ` ${name}="${escapeXml(value).replace(/[\t\n\r]/g, (char) => ATTRIBUTE_SPACE[char] ?? char)}"`,
    )
    .join('');
}

/**
 * One XML element from already written child elements. The exporter builds the scene as a string instead of a DOM,
 * because a DOM needs a browser or jsdom, and the export must also run in a worker or a plain Node script. An element
 * without children is written self-closing.
 */
export function xmlElement(tag: string, attributes: XmlAttributes, children: readonly string[]): string {
  const open = `${tag}${attributeText(attributes)}`;
  return children.length === 0 ? `<${open}/>` : `<${open}>${children.join('')}</${tag}>`;
}

/** One XML element that holds escaped `text`, for leaf values such as `<FixtureID>` or `<Matrix>`. */
export function xmlText(tag: string, text: string, attributes: XmlAttributes = {}): string {
  return `<${tag}${attributeText(attributes)}>${escapeXml(text)}</${tag}>`;
}
