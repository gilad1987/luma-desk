import { MvrError } from '../MvrWarning';

/**
 * Parses MVR or GDTF XML with the browser's own parser, so the importer needs no XML library. `DOMParser` does not
 * throw on bad XML: it returns a document that holds a `<parsererror>` element (at the root or inside the partial
 * tree, by browser). This function turns that into `MvrError('bad-xml')`, so callers never walk a broken tree.
 * Trailing NUL bytes are dropped first: some console exports (grandMA3, Vectorworks samples) end the XML with
 * `\n\0`, which XML forbids but which carries no data.
 */
export function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text.replace(/\0+$/, ''), 'application/xml');
  const error = doc.getElementsByTagName('parsererror')[0];
  if (error) {
    const detail = error.textContent?.trim().split('\n')[0] ?? '';
    throw new MvrError('bad-xml', `The XML is not well formed. ${detail}`.trim());
  }
  return doc;
}
