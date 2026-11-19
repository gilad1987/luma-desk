/** One element of the tiny XML tree: tag, attributes, child elements and its own text. */
export interface XmlNode {
  tag: string;
  attrs: Readonly<Record<string, string>>;
  children: XmlNode[];
  text: string;
}

// Comments, declarations and a doctype (with its internal [...] subset) are skipped; then CDATA, a close tag, an open
// tag, a malformed tag (an unquoted or valueless attribute, which must throw rather than turn into text), or text.
// Written apart from the app's reader on purpose (the probe must share no code with src/mvr), and it runs in Node,
// where the unit tests and the spec's own copy of the file are, so it needs no page and no DOMParser.
const TOKEN =
  /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^[>]*(?:\[[\s\S]*?\]\s*)?>|<![^>]*>|<\/\s*([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|(<[^>]*>?)|([^<]+)/g;
const ATTR = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const NAMED: Readonly<Record<string, string>> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

/** A numeric character reference as text; one past U+10FFFF is an error the reader should name, not a RangeError. */
function codePoint(ref: string, digits: string, radix: number): string {
  const code = parseInt(digits, radix);
  if (code > 0x10ffff) throw new Error(`XML character reference &${ref}; is beyond U+10FFFF`);
  return String.fromCodePoint(code);
}

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, ref: string) => {
    if (ref.startsWith('#x') || ref.startsWith('#X')) return codePoint(ref, ref.slice(2), 16);
    if (ref.startsWith('#')) return codePoint(ref, ref.slice(1), 10);
    return NAMED[ref] ?? whole;
  });
}

function readAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [, name, dq, sq] of text.matchAll(ATTR)) if (name) attrs[name] = decode(dq ?? sq ?? '');
  return attrs;
}

/**
 * Parses XML into a tree, tolerantly: a stray close tag is ignored and an unclosed element ends with its parent, as
 * CAD exports sometimes need. Namespaces are kept in the tag name; MVR scene files use none.
 */
export function parseXml(text: string): XmlNode {
  const root: XmlNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack = [root];
  for (const [, cdata, close, open, attrText, selfClose, bad, chars] of text.matchAll(TOKEN)) {
    const top = stack[stack.length - 1] ?? root;
    if (bad !== undefined) throw new Error(`malformed XML tag ${bad.slice(0, 60)} (attributes need ="..." values)`);
    if (open !== undefined) {
      const node: XmlNode = { tag: open, attrs: readAttrs(attrText ?? ''), children: [], text: '' };
      top.children.push(node);
      if (selfClose !== '/') stack.push(node);
    } else if (close !== undefined) {
      const at = stack.map((n) => n.tag).lastIndexOf(close);
      if (at > 0) stack.length = at;
    } else if (chars !== undefined) top.text += decode(chars);
    else if (cdata !== undefined) top.text += cdata;
  }
  return root;
}

/** The first child element named `tag`. */
export const childOf = (node: XmlNode, tag: string): XmlNode | undefined => node.children.find((c) => c.tag === tag);
