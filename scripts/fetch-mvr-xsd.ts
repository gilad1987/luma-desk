// `npm run fetch:mvr-xsd`: downloads the pinned MVR schema into the gitignored cache for the local XSD test.
// Node runs this file directly (built-in type stripping), so the import keeps its .ts extension.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { MVR_XSD_PATH, MVR_XSD_SHA256, MVR_XSD_URL } from './mvrXsdSource.ts';

const response = await fetch(MVR_XSD_URL);
if (!response.ok) {
  console.error(`fetch:mvr-xsd: ${MVR_XSD_URL} answered ${response.status}`);
  process.exit(1);
}
const bytes = new Uint8Array(await response.arrayBuffer());
const hash = createHash('sha256').update(bytes).digest('hex');
if (hash !== MVR_XSD_SHA256) {
  console.error(`fetch:mvr-xsd: SHA-256 ${hash} is not the pinned ${MVR_XSD_SHA256}`);
  process.exit(1);
}
mkdirSync(dirname(MVR_XSD_PATH), { recursive: true });
writeFileSync(MVR_XSD_PATH, bytes);
console.log(`fetch:mvr-xsd: wrote ${MVR_XSD_PATH} (${bytes.length} bytes)`);
