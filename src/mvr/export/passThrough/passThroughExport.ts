import { strToU8, zipSync, type Zippable } from 'fflate';
import type { StageDesign } from '../../../domain/stage/StageDesign';
import { parseXml } from '../../xml/parseXml';
import type { MvrExportSummary } from '../MvrExportSummary';
import { patchScene } from './patchScene';
import { summarizePassThrough } from './passThroughSummary';
import { readOriginal, type OriginalArchive } from './readOriginal';

/** A fixed ZIP entry time, as in the plain export: two exports of one show give the same bytes. */
const ZIP_TIME = new Date(2000, 0, 1);

/** The UTF-8 byte order mark some writers put before the declaration. */
const BOM = [0xef, 0xbb, 0xbf];

/** The original `<?xml ...?>` declaration, kept as written; none when the file had none (UTF-8 is the default). */
function declarationOf(text: string): string {
  const end = text.indexOf('?>');
  return text.startsWith('<?xml') && end > 0 ? `${text.slice(0, end + 2)}\n` : '';
}

/**
 * The document as text, without a declaration. Firefox writes `<?xml ...?>` itself for a document that had one and
 * Chromium does not, so the serializer's own is taken off and the original is the only one in the file: two
 * declarations are a fatal XML error. A carriage return in the tree can only come from a `&#13;` reference, as the
 * parser reads every literal line end as LF; written raw it would be an LF on the next read, so it goes back as one.
 */
function serialized(doc: Document): string {
  const text = new XMLSerializer().serializeToString(doc);
  return text.replace(/^\s*<\?xml\s[^>]*\?>\s*/, '').replace(/\r/g, '&#13;');
}

/**
 * The patched scene as bytes. The DOM writes it, so these bytes of a real file's scene may differ from the original
 * even where the desk changed nothing: an empty element written `<X></X>` comes out as `<X/>`; white space inside a
 * tag and the quote character of an attribute take the serializer's form; a character reference comes out as the
 * character or the serializer's escape; one line break follows the declaration and one ends the file; white space
 * outside the root element goes. Two things are kept on purpose, because some consoles read strictly: a UTF-8 byte
 * order mark, and CRLF line ends when every line of the original ended so (a file with mixed line ends gets LF, as
 * the parser reads every line end as LF and the place of each kind is then gone).
 */
function sceneBytes(archive: OriginalArchive, doc: Document): Uint8Array {
  const original = archive.entries.find((entry) => entry.name === archive.sceneName)?.bytes ?? new Uint8Array();
  const text = `${declarationOf(archive.sceneText)}${serialized(doc)}\n`;
  const crlf = archive.sceneText.includes('\r\n') && !/(^|[^\r])\n/.test(archive.sceneText);
  const body = strToU8(crlf ? text.replace(/\n/g, '\r\n') : text);
  if (!BOM.every((byte, index) => original[index] === byte)) return body;
  const marked = new Uint8Array(BOM.length + body.length);
  marked.set(BOM);
  marked.set(body, BOM.length);
  return marked;
}

/**
 * Exports an imported design from its original `.mvr` ("pass-through with patch"): the original scene tree, patched
 * where the desk owns the data (`patchScene`), and every other archive entry (GDTF files, meshes, textures) with its
 * bytes unchanged and in its original order. The scene is parsed and written by the DOM, so this path runs only where
 * `DOMParser` exists (the page, jsdom); the plain writer stays for other places. Throws `MvrError` when the original
 * cannot be read, so the caller can fall back to the plain writer and say so.
 */
export function passThroughExport(
  design: StageDesign,
  original: Uint8Array,
): { bytes: Uint8Array; summary: MvrExportSummary } {
  const archive = readOriginal(original);
  const doc = parseXml(archive.sceneText);
  const scene = patchScene(doc, design, original);
  const scenery = sceneBytes(archive, doc);
  const files: Zippable = {};
  for (const entry of archive.entries) {
    // Every entry keeps its method, the scene too: a writer that stored the scene may have a reader that expects it.
    const bytes = entry.name === archive.sceneName ? scenery : entry.bytes;
    files[entry.name] = [bytes, { level: entry.stored ? 0 : 6 }];
  }
  return { bytes: zipSync(files, { mtime: ZIP_TIME }), summary: summarizePassThrough(doc, archive, scene, design) };
}
