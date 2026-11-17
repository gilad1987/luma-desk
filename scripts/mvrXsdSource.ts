import { resolve } from 'node:path';

/**
 * The commit of github.com/mvrdevelopment/tools the XSD is pinned to. A moving branch could change the schema under
 * the test; a commit and its hash cannot, so a new schema version is a deliberate change here.
 */
const COMMIT = '9d4f71c776a6869a042aa63baf6d117be605e908';

/** Where the fetch script downloads the MVR 1.6 schema from. */
export const MVR_XSD_URL = `https://raw.githubusercontent.com/mvrdevelopment/tools/${COMMIT}/mvr.xsd`;

/** SHA-256 of the schema at {@link COMMIT}, so a changed or corrupt download never reaches the test. */
export const MVR_XSD_SHA256 = '85bc42015b706b2ab2bcc2ce69649e7245272b3606217263c90126cda21cb86c';

/**
 * The gitignored local copy. The schema repo has no licence, so the file may not be committed; the XSD test reads it
 * from here and skips when it is absent, which keeps CI free of network access. It is built from the folder, not
 * `import.meta.url`, because a jsdom test gives that URL an http scheme.
 */
export const MVR_XSD_PATH = resolve(import.meta.dirname, '../.cache/mvr/mvr.xsd');
